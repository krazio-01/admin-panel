'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
    CatmullRomCurve3,
    Color,
    Shape,
    Vector3,
    type BufferAttribute,
    type BufferGeometry,
    type Camera,
    type Group,
    type Points,
    type ShaderMaterial,
} from 'three';
import './flypast.scss';
import { useReducedMotion } from '@/components/ui/animations/animations';
import { SceneCanvas } from '@/components/scenes/scene-canvas/scene-canvas';
import {
    orientStripeAxis,
    planFlight,
    SMOKE_STRIPES,
    type FlightPlan,
} from '@/components/scenes/flight-path';

const TRAIL_LENGTH = 200;
const TRAIL_SPACING = 0.0022;
const TRAIL_HEAD_GAP = 0.012;
const TRAIL_SPREAD = 0.006;
const TRAIL_FADE_SECONDS = 1.2;
const FIRST_FLIGHT_DELAY = 0.6;
const MAX_FRAME_SECONDS = 0.1;
const JET_SCALE = 0.45;
const TANGENT_SAMPLE_STEP = 0.0005;

const smokeVertexShader = `
attribute float alpha;
attribute vec3 stripeColor;
uniform float uPixelRatio;
varying float vAlpha;
varying vec3 vColor;
void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    vAlpha = alpha;
    vColor = stripeColor;
    gl_PointSize = (4.0 + alpha * 14.0) * uPixelRatio * (30.0 / -viewPosition.z);
}`;

const smokeFragmentShader = `
varying float vAlpha;
varying vec3 vColor;
void main() {
    float distanceFromCenter = length(gl_PointCoord - 0.5);
    float isWhite = step(2.9, vColor.r + vColor.g + vColor.b);
    vec3 edgeColor = mix(vec3(0.86), vec3(1.0), smoothstep(0.5, 0.1, distanceFromCenter));
    vec3 color = mix(vColor, edgeColor, isWhite);
    gl_FragColor = vec4(color, smoothstep(0.5, 0.05, distanceFromCenter) * vAlpha * 0.6);
}`;

const scratch = {
    unprojected: new Vector3(),
    tangent: new Vector3(),
    lookTarget: new Vector3(),
    trailPoint: new Vector3(),
    trailTangent: new Vector3(),
    sideways: new Vector3(),
    viewDirection: new Vector3(),
    tangentStart: new Vector3(),
    tangentEnd: new Vector3(),
};

function sampleTangent(curve: CatmullRomCurve3, along: number, target: Vector3): Vector3 {
    const start = Math.max(0, along - TANGENT_SAMPLE_STEP);
    const end = Math.min(1, along + TANGENT_SAMPLE_STEP);

    curve.getPointAt(start, scratch.tangentStart);
    curve.getPointAt(end, scratch.tangentEnd);

    target.subVectors(scratch.tangentEnd, scratch.tangentStart);

    return target.normalize();
}

function createShape(points: [number, number][]): Shape {
    const shape = new Shape();
    const [first, ...rest] = points;

    shape.moveTo(first[0], first[1]);

    for (const [x, y] of rest) shape.lineTo(x, y);

    return shape;
}

const WING_SHAPE = createShape([
    [0.9, 0],
    [-1.2, 2.5],
    [-1.7, 2.5],
    [-1.35, 0],
    [0.9, 0],
]);

const FIN_SHAPE = createShape([
    [-1, 0],
    [-1.85, 1.25],
    [-2.2, 1.25],
    [-2, 0],
    [-1, 0],
]);

const WING_EXTRUDE = { depth: 0.06, bevelEnabled: false };
const FIN_EXTRUDE = { depth: 0.05, bevelEnabled: false };
const BODY_FINISH = { color: '#27272a', metalness: 0.35, roughness: 0.35 };
const TRIM_FINISH = { color: '#a1a1aa', metalness: 0.3, roughness: 0.4 };

function createTrailBuffers() {
    const pointCount = TRAIL_LENGTH * SMOKE_STRIPES.length;
    const colors = new Float32Array(pointCount * 3);
    const stripeColor = new Color();

    SMOKE_STRIPES.forEach((stripe, stripeIndex) => {
        stripeColor.set(stripe.color);

        for (let point = 0; point < TRAIL_LENGTH; point += 1) {
            const offset = (stripeIndex * TRAIL_LENGTH + point) * 3;
            colors[offset] = stripeColor.r;
            colors[offset + 1] = stripeColor.g;
            colors[offset + 2] = stripeColor.b;
        }
    });

    return {
        positions: new Float32Array(pointCount * 3),
        alphas: new Float32Array(pointCount),
        colors,
    };
}

function toWorldCurve(plan: FlightPlan, camera: Camera): CatmullRomCurve3 {
    const points = plan.points.map(([x, y, depth]) => {
        const direction = scratch.unprojected.set(x, y, 0.5);

        direction.unproject(camera);
        direction.sub(camera.position);
        direction.normalize();

        return camera.position.clone().addScaledVector(direction, depth);
    });

    return new CatmullRomCurve3(points);
}

type Flight = { curve: CatmullRomCurve3; start: number; duration: number; next: number };

function JetAnimation() {
    const jetRef = useRef<Group>(null);
    const trailRef = useRef<Points<BufferGeometry, ShaderMaterial>>(null);
    const elapsedRef = useRef(0);
    const flightRef = useRef<Flight | null>(null);
    const trailBuffers = useMemo(() => createTrailBuffers(), []);
    const smokeUniforms = useMemo(() => ({ uPixelRatio: { value: 1 } }), []);

    useFrame((state, delta) => {
        const jet = jetRef.current;
        const trail = trailRef.current;
        if (!jet || !trail) return;

        elapsedRef.current += Math.min(delta, MAX_FRAME_SECONDS);

        const time = elapsedRef.current;
        const { camera, gl } = state;

        if (time < FIRST_FLIGHT_DELAY) return;

        if (!flightRef.current || time > flightRef.current.next) {
            camera.updateMatrixWorld();

            const plan = planFlight(Math.random);

            flightRef.current = {
                curve: toWorldCurve(plan, camera),
                start: time,
                duration: plan.duration,
                next: time + plan.duration + plan.pause,
            };
        }

        const flight = flightRef.current;
        const progress = Math.min(1, (time - flight.start) / flight.duration);

        jet.visible = progress < 1;

        if (jet.visible) {
            flight.curve.getPointAt(progress, jet.position);
            sampleTangent(flight.curve, progress, scratch.tangent);
            jet.lookAt(scratch.lookTarget.copy(jet.position).add(scratch.tangent));
            jet.rotateY(-Math.PI / 2);
            jet.rotateX(Math.sin(progress * Math.PI) * 0.35);
        }

        const fade =
            progress < 1
                ? 1
                : Math.max(0, 1 - (time - flight.start - flight.duration) / TRAIL_FADE_SECONDS);
        const head = Math.max(0, progress - TRAIL_HEAD_GAP);
        const positions = trail.geometry.getAttribute('position') as BufferAttribute;
        const alphas = trail.geometry.getAttribute('alpha') as BufferAttribute;

        camera.getWorldDirection(scratch.viewDirection);
        trail.material.uniforms.uPixelRatio.value = gl.getPixelRatio();

        for (let point = 0; point < TRAIL_LENGTH; point += 1) {
            const along = head - point * TRAIL_SPACING;

            if (along <= 0) {
                for (let stripeIndex = 0; stripeIndex < SMOKE_STRIPES.length; stripeIndex += 1) {
                    alphas.setX(stripeIndex * TRAIL_LENGTH + point, 0);
                }
                continue;
            }

            flight.curve.getPointAt(along, scratch.trailPoint);
            sampleTangent(flight.curve, along, scratch.trailTangent);
            scratch.sideways.crossVectors(scratch.trailTangent, scratch.viewDirection).normalize();

            const axis = orientStripeAxis(scratch.sideways);
            const spread = 1 + point * TRAIL_SPREAD;

            for (let stripeIndex = 0; stripeIndex < SMOKE_STRIPES.length; stripeIndex += 1) {
                const index = stripeIndex * TRAIL_LENGTH + point;
                const offset = SMOKE_STRIPES[stripeIndex].offset * spread;

                positions.setXYZ(
                    index,
                    scratch.trailPoint.x + axis.x * offset,
                    scratch.trailPoint.y + axis.y * offset,
                    scratch.trailPoint.z + axis.z * offset,
                );
                alphas.setX(index, (1 - point / TRAIL_LENGTH) * fade);
            }
        }

        positions.needsUpdate = true;
        alphas.needsUpdate = true;
    });

    return (
        <>
            <hemisphereLight args={['#ffffff', '#d4d4d8', 1.15]} />
            <directionalLight position={[-8, 20, 14]} intensity={1.6} />

            <group ref={jetRef} scale={JET_SCALE} visible={false}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.3, 0.4, 4, 18]} />
                    <meshStandardMaterial {...BODY_FINISH} />
                </mesh>
                <mesh rotation={[0, 0, -Math.PI / 2]} position={[2.75, 0, 0]}>
                    <coneGeometry args={[0.3, 1.5, 18]} />
                    <meshStandardMaterial {...BODY_FINISH} />
                </mesh>
                <mesh scale={[2.2, 0.9, 0.9]} position={[1.2, 0.24, 0]}>
                    <sphereGeometry args={[0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial {...TRIM_FINISH} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <extrudeGeometry args={[WING_SHAPE, WING_EXTRUDE]} />
                    <meshStandardMaterial {...BODY_FINISH} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, -1]}>
                    <extrudeGeometry args={[WING_SHAPE, WING_EXTRUDE]} />
                    <meshStandardMaterial {...BODY_FINISH} />
                </mesh>
                <mesh position={[0, 0.22, -0.025]}>
                    <extrudeGeometry args={[FIN_SHAPE, FIN_EXTRUDE]} />
                    <meshStandardMaterial {...TRIM_FINISH} />
                </mesh>
            </group>

            <points ref={trailRef} frustumCulled={false}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[trailBuffers.positions, 3]}
                    />
                    <bufferAttribute attach="attributes-alpha" args={[trailBuffers.alphas, 1]} />
                    <bufferAttribute
                        attach="attributes-stripeColor"
                        args={[trailBuffers.colors, 3]}
                    />
                </bufferGeometry>
                <shaderMaterial
                    transparent
                    depthWrite={false}
                    uniforms={smokeUniforms}
                    vertexShader={smokeVertexShader}
                    fragmentShader={smokeFragmentShader}
                />
            </points>
        </>
    );
}

export function Flypast() {
    const prefersReducedMotion = useReducedMotion() ?? false;

    if (prefersReducedMotion) return null;

    return (
        <div className="flypast" data-scene="jet">
            <SceneCanvas
                fallback={null}
                transparent
                camera={{ fov: 30, near: 0.1, far: 400, position: [0, 0, 0] }}
            >
                <JetAnimation />
            </SceneCanvas>
        </div>
    );
}
