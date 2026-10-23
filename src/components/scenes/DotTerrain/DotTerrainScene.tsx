'use client';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
    BufferAttribute,
    BufferGeometry,
    Color,
    Vector3,
    Vector4,
    type ShaderMaterial,
} from 'three';
import { SceneCanvas } from '@/components/scenes/SceneCanvas/SceneCanvas';
import { usePrefersReducedMotion } from '@/components/scenes/sceneSupport';
import { useAppContext } from '@/context/appContext';
import type { SignInPhase, SignInPulseTone, SignInState } from '@/context/appStore';

type PulseRipple = {
    center: [number, number];
    spread: [number, number];
    strength: number;
    darkness: number;
};

type PointerState = { x: number; y: number; targetX: number; targetY: number };

const COLUMNS = 240;
const ROWS = 120;
const SPACING = 0.11;
const FRONT_Z = 4;
const MAX_RIPPLES = 8;
const INTRO_SECONDS = 1.8;
const MAX_FRAME_SECONDS = 0.1;
const EASE_RATE = 2.45;
const FLOW_SPEED = 3.6;
const STILL_TIME = 4;
const MASK_FADE_PIXELS = 90;
const MASK_DIMMING = 0.55;
const PARALLAX_X = 0.7;
const PARALLAX_Y = 0.35;
const DOT_COLOR = '#3f3f46';
const RIPPLE_DARK_COLOR = '#09090b';
const CAMERA_HOME: [number, number, number] = [0, 2.6, 6.8];
const CAMERA_TARGET = new Vector3(0, -0.35, -2);
const CALM_PHASES = new Set<SignInPhase>(['focused', 'submitting', 'failed']);

const PULSE_RIPPLES: Record<SignInPulseTone, PulseRipple> = {
    soft: { center: [0, 0.9], spread: [1.6, 0.6], strength: 0.55, darkness: 0 },
    error: { center: [0, 0.8], spread: [0, 0], strength: 1.2, darkness: 0.9 },
    success: { center: [0, 0.8], spread: [0, 0], strength: 1.4, darkness: 0 },
};

const terrainVertexShader = `
uniform float uTime;
uniform float uCalm;
uniform float uIntro;
uniform float uFlow;
uniform vec4 uRipples[${MAX_RIPPLES}];
uniform float uRippleTone[${MAX_RIPPLES}];
varying float vFade;
varying float vDark;
void main() {
    vec3 p = position;
    float depth = ${(ROWS * SPACING).toFixed(4)};
    float back = ${(FRONT_Z - ROWS * SPACING).toFixed(4)};
    p.z = back + mod(p.z - back + uFlow, depth);
    float swell = sin(p.x * 0.55 + uTime * 0.35) * 0.22 + cos(p.z * 0.7 - uTime * 0.25) * 0.18 + sin((p.x + p.z) * 0.3 + uTime * 0.2) * 0.12;
    float nearCenter = exp(-(p.x * p.x) * 0.08 - (p.z - 0.5) * (p.z - 0.5) * 0.12);
    swell *= 1.0 - uCalm * 0.75 * nearCenter;
    float rise = smoothstep(0.0, 1.0, uIntro * 1.6 - (${FRONT_Z.toFixed(1)} - p.z) * 0.06);
    float ripple = 0.0;
    float dark = 0.0;
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
        vec4 r = uRipples[i];
        float age = uTime - r.z;
        if (age < 0.0 || age > 4.0) continue;
        float d = distance(p.xz, r.xy);
        float offset = d - age * 2.4;
        float band = exp(-offset * offset * 3.0);
        float fade = (1.0 - age / 4.0) * r.w;
        ripple += sin(offset * 4.0) * band * fade * 0.18;
        dark += band * fade * uRippleTone[i];
    }
    p.y = (swell + ripple) * rise - (1.0 - rise) * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 2.5 * (6.0 / -mv.z);
    vFade = smoothstep(18.0, 3.5, -mv.z) * rise;
    vDark = clamp(dark, 0.0, 1.0);
}`;

const terrainFragmentShader = `
uniform vec4 uMask;
uniform float uMaskFade;
uniform vec3 uDotColor;
uniform vec3 uDarkColor;
varying float vFade;
varying float vDark;
void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    vec2 q = max(abs(gl_FragCoord.xy - uMask.xy) - uMask.zw, 0.0);
    float underMask = 1.0 - smoothstep(0.0, uMaskFade, length(q));
    vec3 color = mix(uDotColor, uDarkColor, vDark);
    float alpha = vFade * (0.62 + vDark * 0.3) * smoothstep(0.5, 0.2, d) * (1.0 - underMask * ${MASK_DIMMING});
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
}`;

function createTerrainGeometry(): BufferGeometry {
    const positions = new Float32Array(COLUMNS * ROWS * 3);

    for (let column = 0; column < COLUMNS; column += 1) {
        for (let row = 0; row < ROWS; row += 1) {
            const offset = (column * ROWS + row) * 3;

            positions[offset] = (column - COLUMNS / 2) * SPACING;
            positions[offset + 2] = FRONT_Z - row * SPACING;
        }
    }

    const geometry = new BufferGeometry();

    geometry.setAttribute('position', new BufferAttribute(positions, 3));

    return geometry;
}

function TerrainPoints({
    signIn,
    maskRef,
    isStill,
}: {
    signIn: SignInState;
    maskRef: RefObject<HTMLElement | null>;
    isStill: boolean;
}) {
    const gl = useThree((state) => state.gl);
    const invalidate = useThree((state) => state.invalidate);
    const pixelRatio = useThree((state) => state.viewport.dpr);
    const elapsedRef = useRef(0);
    const calmRef = useRef(0);
    const flowRef = useRef(0);
    const rippleCountRef = useRef(0);
    const lastPulseRef = useRef(signIn.pulse);
    const phaseRef = useRef(signIn.phase);
    const materialRef = useRef<ShaderMaterial>(null);
    const pointerRef = useRef<PointerState>({ x: 0, y: 0, targetX: 0, targetY: 0 });
    const geometry = useMemo(() => createTerrainGeometry(), []);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uCalm: { value: 0 },
            uIntro: { value: 0 },
            uFlow: { value: 0 },
            uMask: { value: new Vector4() },
            uMaskFade: { value: MASK_FADE_PIXELS },
            uDotColor: { value: new Color(DOT_COLOR) },
            uDarkColor: { value: new Color(RIPPLE_DARK_COLOR) },
            uRipples: {
                value: Array.from({ length: MAX_RIPPLES }, () => new Vector4(0, 0, -99, 0)),
            },
            uRippleTone: { value: new Float32Array(MAX_RIPPLES) },
        }),
        [],
    );

    useEffect(() => () => geometry.dispose(), [geometry]);

    useEffect(() => {
        phaseRef.current = signIn.phase;
        invalidate();
    }, [signIn.phase, invalidate]);

    useEffect(() => {
        const material = materialRef.current;
        if (!material || signIn.pulse === lastPulseRef.current) return;

        lastPulseRef.current = signIn.pulse;

        const ripple = PULSE_RIPPLES[signIn.pulseTone];
        const slot = rippleCountRef.current % MAX_RIPPLES;
        const x = ripple.center[0] + (Math.random() - 0.5) * ripple.spread[0];
        const z = ripple.center[1] + (Math.random() - 0.5) * ripple.spread[1];

        rippleCountRef.current += 1;
        material.uniforms.uRipples.value[slot].set(x, z, elapsedRef.current, ripple.strength);
        material.uniforms.uRippleTone.value[slot] = ripple.darkness;
        invalidate();
    }, [signIn.pulse, signIn.pulseTone, invalidate]);

    useEffect(() => {
        const mask = maskRef.current;
        const canvas = gl.domElement;

        const updateMask = () => {
            const material = materialRef.current;
            if (!mask || !material) return;

            const maskRect = mask.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();

            material.uniforms.uMask.value.set(
                (maskRect.left - canvasRect.left + maskRect.width / 2) * pixelRatio,
                (canvasRect.bottom - maskRect.bottom + maskRect.height / 2) * pixelRatio,
                (maskRect.width / 2) * pixelRatio,
                (maskRect.height / 2) * pixelRatio,
            );
            material.uniforms.uMaskFade.value = MASK_FADE_PIXELS * pixelRatio;
            invalidate();
        };

        const observer = new ResizeObserver(updateMask);

        if (mask) observer.observe(mask);
        observer.observe(canvas);
        updateMask();

        return () => observer.disconnect();
    }, [gl, maskRef, pixelRatio, invalidate]);

    useEffect(() => {
        const pointer = pointerRef.current;

        const followPointer = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse') return;

            pointer.targetX = event.clientX / window.innerWidth - 0.5;
            pointer.targetY = event.clientY / window.innerHeight - 0.5;
        };

        const releasePointer = (event: PointerEvent) => {
            if (event.relatedTarget) return;

            pointer.targetX = 0;
            pointer.targetY = 0;
        };

        window.addEventListener('pointermove', followPointer);
        window.addEventListener('pointerout', releasePointer);

        return () => {
            window.removeEventListener('pointermove', followPointer);
            window.removeEventListener('pointerout', releasePointer);
        };
    }, []);

    useFrame(({ camera }, delta) => {
        const material = materialRef.current;
        if (!material) return;

        const step = isStill ? 0 : Math.min(delta, MAX_FRAME_SECONDS);
        const ease = isStill ? 1 : 1 - Math.exp(-step * EASE_RATE);
        const pointer = pointerRef.current;
        const phase = phaseRef.current;

        elapsedRef.current += step;
        calmRef.current += ((CALM_PHASES.has(phase) ? 1 : 0) - calmRef.current) * ease;
        pointer.x += (pointer.targetX - pointer.x) * ease;
        pointer.y += (pointer.targetY - pointer.y) * ease;

        if (phase === 'succeeded') flowRef.current += step * FLOW_SPEED;

        material.uniforms.uTime.value = isStill ? STILL_TIME : elapsedRef.current;
        material.uniforms.uCalm.value = calmRef.current;
        material.uniforms.uIntro.value = isStill
            ? 1
            : Math.min(1, elapsedRef.current / INTRO_SECONDS);
        material.uniforms.uFlow.value = flowRef.current;

        camera.position.set(
            CAMERA_HOME[0] + pointer.x * PARALLAX_X,
            CAMERA_HOME[1] - pointer.y * PARALLAX_Y,
            CAMERA_HOME[2],
        );
        camera.lookAt(CAMERA_TARGET);
    });

    return (
        <points geometry={geometry} frustumCulled={false}>
            <shaderMaterial
                ref={materialRef}
                transparent
                depthWrite={false}
                uniforms={uniforms}
                vertexShader={terrainVertexShader}
                fragmentShader={terrainFragmentShader}
            />
        </points>
    );
}

export function DotTerrainScene({
    maskRef,
    className,
    onFirstFrame,
}: {
    maskRef: RefObject<HTMLElement | null>;
    className?: string;
    onFirstFrame?: () => void;
}) {
    const signIn = useAppContext('signIn');
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
        <SceneCanvas
            className={className}
            fallback={null}
            camera={{ fov: 40, near: 0.1, far: 100, position: CAMERA_HOME }}
            transparent
            isStill={prefersReducedMotion}
            onFirstFrame={onFirstFrame}
        >
            <TerrainPoints signIn={signIn} maskRef={maskRef} isStill={prefersReducedMotion} />
        </SceneCanvas>
    );
}
