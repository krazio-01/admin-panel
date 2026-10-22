'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
    Color,
    DoubleSide,
    Mesh,
    MeshBasicMaterial,
    RingGeometry,
    type Group,
    type ShaderMaterial,
} from 'three';
import { usePrefersReducedMotion } from '@/components/scenes/sceneSupport';
import { RadarFallback } from '@/components/scenes/RadarFallback/RadarFallback';
import { SceneCanvas } from '@/components/scenes/SceneCanvas/SceneCanvas';

type ScanOutcome = 'ok' | 'used' | 'bad';

const OUTCOME_COLORS: Record<ScanOutcome, string> = {
    ok: '#16a34a',
    used: '#d97706',
    bad: '#dc2626',
};

const IDLE_COLOR = '#ffffff';
const FLASH_SECONDS = 1.6;
const COLOR_EASE_RATE = 9.75;
const BURST_COUNT = 3;
const BURST_STAGGER_SECONDS = 0.12;
const BURST_SECONDS = 0.8;
const MAX_FRAME_SECONDS = 0.1;
const FRAME_HALF_SIZE = 1.45;
const BRACKET_ARM = 0.7;
const BRACKET_THICKNESS = 0.09;
const BRACKET_INSET = 0.31;
const STILL_TIME = 0.35;
const FRAME_CENTER_Y = 0.55;

const idleColor = new Color(IDLE_COLOR);

const CORNERS: [number, number][] = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
];

const radarVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const radarFragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
void main() {
    vec2 point = vUv - 0.5;
    float radius = length(point) * 2.0;
    if (radius > 1.0) discard;
    float angle = atan(point.y, point.x);
    float sweep = mod(angle - uTime * 2.2, 6.28318) / 6.28318;
    float beam = pow(1.0 - sweep, 6.0) * 0.55;
    float rings = smoothstep(0.012, 0.0, abs(fract(radius * 4.0) - 0.5) - 0.48) * 0.25;
    float edge = smoothstep(0.02, 0.0, abs(radius - 0.985)) * 0.8;
    float crossLines = (smoothstep(0.006, 0.0, abs(point.x)) + smoothstep(0.006, 0.0, abs(point.y))) * 0.12;
    float alpha = (beam + rings + edge + crossLines) * uIntensity * smoothstep(1.0, 0.85, radius);
    gl_FragColor = vec4(uColor, alpha);
}`;

function RadarOverlay({
    outcome,
    scanKey,
    isStill,
}: {
    outcome: ScanOutcome | null;
    scanKey?: number | string;
    isStill: boolean;
}) {
    const radarMaterialRef = useRef<ShaderMaterial>(null);
    const frameGroupRef = useRef<Group>(null);
    const scanLineRef = useRef<Mesh>(null);
    const burstsRef = useRef<Group>(null);
    const elapsedRef = useRef(0);
    const flashRef = useRef({ color: new Color(IDLE_COLOR), until: -1 });
    const isStillRef = useRef(isStill);
    const bracketMaterialsRef = useRef<MeshBasicMaterial[]>([]);
    const invalidate = useThree((state) => state.invalidate);
    const burstGeometry = useMemo(() => new RingGeometry(0.9, 1, 64), []);

    const radarUniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uColor: { value: new Color(IDLE_COLOR) },
            uIntensity: { value: 1 },
        }),
        [],
    );

    useEffect(() => () => burstGeometry.dispose(), [burstGeometry]);

    useEffect(() => {
        isStillRef.current = isStill;
    }, [isStill]);

    useEffect(() => {
        const frameGroup = frameGroupRef.current;
        if (!frameGroup) return;

        const materials: MeshBasicMaterial[] = [];

        frameGroup.traverse((part) => {
            if (part instanceof Mesh) materials.push(part.material as MeshBasicMaterial);
        });

        bracketMaterialsRef.current = materials;
    }, []);

    useEffect(() => {
        const flash = flashRef.current;

        if (!outcome) {
            flash.until = -1;
            invalidate();
            return;
        }

        const color = OUTCOME_COLORS[outcome];
        flash.color.set(color);
        flash.until = elapsedRef.current + FLASH_SECONDS;

        const group = burstsRef.current;

        if (!isStillRef.current && group) {
            for (let burst = 0; burst < BURST_COUNT; burst += 1) {
                const ring = new Mesh(
                    burstGeometry,
                    new MeshBasicMaterial({
                        color,
                        transparent: true,
                        opacity: 0.9,
                        side: DoubleSide,
                        depthWrite: false,
                    }),
                );

                ring.visible = false;
                ring.userData.bornAt = elapsedRef.current + burst * BURST_STAGGER_SECONDS;
                group.add(ring);
            }
        }

        invalidate();
    }, [outcome, scanKey, burstGeometry, invalidate]);

    useFrame((_state, delta) => {
        const radarMaterial = radarMaterialRef.current;
        const frameGroup = frameGroupRef.current;
        const scanLine = scanLineRef.current;
        const bursts = burstsRef.current;
        if (!radarMaterial || !frameGroup || !scanLine || !bursts) return;

        if (!isStill) elapsedRef.current += Math.min(delta, MAX_FRAME_SECONDS);

        const time = isStill ? STILL_TIME : elapsedRef.current;
        const flash = flashRef.current;
        const isFlashing = isStill ? outcome !== null : time < flash.until;
        const targetColor = isFlashing ? flash.color : idleColor;
        const ease = isStill
            ? 1
            : 1 - Math.exp(-Math.min(delta, MAX_FRAME_SECONDS) * COLOR_EASE_RATE);

        radarMaterial.uniforms.uTime.value = time;
        (radarMaterial.uniforms.uColor.value as Color).lerp(targetColor, ease);

        const bracketMaterials = bracketMaterialsRef.current;

        for (let materialIndex = 0; materialIndex < bracketMaterials.length; materialIndex += 1) {
            bracketMaterials[materialIndex].color.lerp(targetColor, ease);
        }

        frameGroup.rotation.y = Math.sin(time * 0.8) * 0.12;
        frameGroup.rotation.x = Math.cos(time * 0.6) * 0.08;
        frameGroup.scale.setScalar(1 + Math.sin(time * 2.4) * 0.025 + (isFlashing ? 0.06 : 0));

        scanLine.position.y = Math.sin(time * 2.2) * 1.25;
        scanLine.visible = !isFlashing;

        for (let ringIndex = bursts.children.length - 1; ringIndex >= 0; ringIndex -= 1) {
            const ring = bursts.children[ringIndex];
            const age = time - (ring.userData.bornAt as number);
            const material = (ring as Mesh).material as MeshBasicMaterial;

            ring.visible = age > 0;
            ring.scale.setScalar(1 + Math.max(0, age) * 3.5);
            material.opacity = Math.max(0, 0.9 - age * 1.4);

            if (age <= BURST_SECONDS) continue;

            ring.removeFromParent();
            material.dispose();
        }
    });

    return (
        <>
            <mesh rotation={[-0.95, 0, 0]} position={[0, -0.9, 0]}>
                <planeGeometry args={[6.4, 6.4]} />
                <shaderMaterial
                    ref={radarMaterialRef}
                    transparent
                    depthWrite={false}
                    uniforms={radarUniforms}
                    vertexShader={radarVertexShader}
                    fragmentShader={radarFragmentShader}
                />
            </mesh>

            <group ref={frameGroupRef} position={[0, FRAME_CENTER_Y, 0]}>
                {CORNERS.map(([x, y]) => (
                    <group key={`${x}:${y}`}>
                        <mesh
                            position={[
                                x * FRAME_HALF_SIZE - x * BRACKET_INSET,
                                y * FRAME_HALF_SIZE,
                                0,
                            ]}
                        >
                            <boxGeometry
                                args={[BRACKET_ARM, BRACKET_THICKNESS, BRACKET_THICKNESS]}
                            />
                            <meshBasicMaterial color={IDLE_COLOR} />
                        </mesh>
                        <mesh
                            position={[
                                x * FRAME_HALF_SIZE,
                                y * FRAME_HALF_SIZE - y * BRACKET_INSET,
                                0,
                            ]}
                        >
                            <boxGeometry
                                args={[BRACKET_THICKNESS, BRACKET_ARM, BRACKET_THICKNESS]}
                            />
                            <meshBasicMaterial color={IDLE_COLOR} />
                        </mesh>
                    </group>
                ))}

                <mesh ref={scanLineRef}>
                    <planeGeometry args={[2.7, 0.04]} />
                    <meshBasicMaterial color={IDLE_COLOR} transparent opacity={0.85} />
                </mesh>
            </group>

            <group ref={burstsRef} position={[0, FRAME_CENTER_Y, 0]} />
        </>
    );
}

export function Radar({
    outcome = null,
    scanKey,
    className,
}: {
    outcome?: ScanOutcome | null;
    scanKey?: number | string;
    className?: string;
}) {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
        <SceneCanvas
            className={className}
            fallback={<RadarFallback outcome={outcome} />}
            camera={{ fov: 40, near: 0.1, far: 100, position: [0, 0, 9] }}
            transparent
            isStill={prefersReducedMotion}
        >
            <RadarOverlay outcome={outcome} scanKey={scanKey} isStill={prefersReducedMotion} />
        </SceneCanvas>
    );
}
