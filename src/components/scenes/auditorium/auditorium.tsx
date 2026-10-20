'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
    BoxGeometry,
    CanvasTexture,
    Color,
    DoubleSide,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Object3D,
    PerspectiveCamera,
    RingGeometry,
    SRGBColorSpace,
    Vector2,
    Vector3,
    type InstancedMesh,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { useReducedMotion } from '@/components/ui/animations/animations';
import { AuditoriumFallback } from '@/components/scenes/auditorium-fallback/auditorium-fallback';
import { SceneCanvas } from '@/components/scenes/scene-canvas/scene-canvas';
import { fitLabelFontSize } from '@/components/scenes/text-fit';
import {
    computeSeatLayout,
    FRONT_ROW_Z,
    hallBounds,
    ROW_RISE,
    ROW_SPACING,
} from '@/components/scenes/seat-layout';

type SeatState = 'booked' | 'checkedIn';

type AuditoriumProps = {
    rows: number;
    seatsPerRow: number;
    seats: Record<string, SeatState>;
    highlight?: string[];
    eventName: string;
    pulseLabels?: string[];
    variant?: 'booking' | 'admin';
};

const SEAT_COLORS = {
    available: '#e4e4e7',
    booked: '#71717a',
    adminBooked: '#a1a1aa',
    checkedIn: '#09090b',
    glow: '#16a34a',
};

const PROTOTYPE_WIDTH = 17.4;
const PROTOTYPE_DEPTH = 15.4;
const RISE_SECONDS = 0.5;
const LONGEST_RISE_DELAY = 1;
const MAX_FRAME_SECONDS = 0.1;
const HOP_SECONDS = 0.6;
const HOP_HEIGHT = 0.35;
const GLOW_SECONDS = 1.2;
const RIPPLE_SECONDS = 1;
const HIGHLIGHT_GLIDE = 0.35;
const HIGHLIGHT_ZOOM = 0.85;
const CAMERA_OFFSET = new Vector3(0, 14.4, 21.8);
const NO_LABELS: string[] = [];
const NARROW_VIEWPORT = 600;
const NARROW_FOV = 44;
const WIDE_FOV = 32;
const FALLBACK_FONT_FAMILY = 'system-ui, sans-serif';
const SCREEN_TEXTURE = { width: 2048, height: 512, padding: 124, size: 190, spacing: 0.12 };

const scratchObject = new Object3D();
const scratchColor = new Color();
const glowColor = new Color(SEAT_COLORS.glow);
const highlightColor = new Color(SEAT_COLORS.checkedIn);
const highlightDimColor = new Color(SEAT_COLORS.booked);
const stillPointer = new Vector2();
const desiredFocusVector = new Vector3();

const easeOutBack = (progress: number) =>
    1 + 2.2 * Math.pow(progress - 1, 3) + 1.2 * Math.pow(progress - 1, 2);

function createLabelTexture({
    text,
    width,
    height,
    background,
    color,
    size,
    spacing,
    maxTextWidth,
    fontFamily,
}: {
    text: string;
    width: number;
    height: number;
    background: string;
    color: string;
    size: number;
    spacing: number;
    maxTextWidth: number;
    fontFamily: string;
}): CanvasTexture {
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = width;
    labelCanvas.height = height;

    const context = labelCanvas.getContext('2d')!;

    context.letterSpacing = `${spacing}em`;

    const fittedSize = fitLabelFontSize(text, maxTextWidth, size, (label, candidateSize) => {
        context.font = `600 ${candidateSize}px ${fontFamily}`;

        return context.measureText(label).width;
    });

    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.fillStyle = color;
    context.font = `600 ${fittedSize}px ${fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, width / 2, height / 2);

    const texture = new CanvasTexture(labelCanvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;

    return texture;
}

function createChairGeometry() {
    const seat = new BoxGeometry(0.62, 0.14, 0.56);
    seat.translate(0, 0.42, 0.02);

    const back = new BoxGeometry(0.62, 0.58, 0.12);
    back.translate(0, 0.66, 0.27);

    const legs = new BoxGeometry(0.5, 0.36, 0.4);
    legs.translate(0, 0.18, 0.02);

    const chair = mergeGeometries([seat, back, legs]);

    seat.dispose();
    back.dispose();
    legs.dispose();

    return chair;
}

function useLabelFontFamily(): string {
    const [fontFamily, setFontFamily] = useState(FALLBACK_FONT_FAMILY);

    useEffect(() => {
        let isMounted = true;

        document.fonts.ready.then(() => {
            if (!isMounted) return;

            const rootStyle = getComputedStyle(document.documentElement);
            const geist = rootStyle.getPropertyValue('--font-geist-sans').trim();

            if (geist) setFontFamily(`${geist}, ${FALLBACK_FONT_FAMILY}`);
        });

        return () => {
            isMounted = false;
        };
    }, []);

    return fontFamily;
}

export function Auditorium({
    rows,
    seatsPerRow,
    seats,
    highlight = NO_LABELS,
    eventName,
    pulseLabels = NO_LABELS,
    variant = 'booking',
    isStill = false,
}: AuditoriumProps & { isStill?: boolean }) {
    const seatsRef = useRef<InstancedMesh>(null);
    const ripplesRef = useRef<Group>(null);
    const markerRef = useRef<Mesh>(null);
    const markerMaterialRef = useRef<MeshBasicMaterial>(null);
    const elapsedRef = useRef(0);
    const isRisingRef = useRef(!isStill);
    const pulsesRef = useRef(new Map<number, number>());
    const previousPulseLabelsRef = useRef(new Set(pulseLabels));
    const pointerRef = useRef(new Vector2());
    const focusRef = useRef<Vector3 | null>(null);

    const invalidate = useThree((state) => state.invalidate);
    const fontFamily = useLabelFontFamily();

    const layout = useMemo(() => computeSeatLayout(rows, seatsPerRow), [rows, seatsPerRow]);
    const bounds = useMemo(() => hallBounds(rows, seatsPerRow), [rows, seatsPerRow]);
    const chairGeometry = useMemo(() => createChairGeometry(), []);
    const rippleGeometry = useMemo(() => new RingGeometry(0.35, 0.42, 40), []);
    const tierMaterial = useMemo(
        () => new MeshStandardMaterial({ color: '#fafafa', roughness: 0.85 }),
        [],
    );

    const indexByLabel = useMemo(
        () => new Map(layout.map((placement, index) => [placement.label, index])),
        [layout],
    );

    const riseTiming = useMemo(() => {
        const longestDelay = Math.max(0, ...layout.map((placement) => placement.delay));
        const delayScale =
            longestDelay > LONGEST_RISE_DELAY ? LONGEST_RISE_DELAY / longestDelay : 1;

        return { delayScale, end: longestDelay * delayScale + RISE_SECONDS };
    }, [layout]);

    const geometry = useMemo(() => {
        const frontEdgeZ = FRONT_ROW_Z - 5.5;
        const hallScale = Math.max(
            0.7,
            bounds.width / PROTOTYPE_WIDTH,
            bounds.depth / PROTOTYPE_DEPTH,
        );
        const stageWidth = bounds.width * 0.8;
        const screenWidth = (stageWidth * 10) / 14;
        const screenHeight = screenWidth * 0.26;
        const floorCenterZ = frontEdgeZ + bounds.depth / 2;

        return {
            hallScale,
            floor: { width: bounds.width + 1.2, depth: bounds.depth, z: floorCenterZ },
            stage: { width: stageWidth, z: FRONT_ROW_Z - 3.4 },
            stageLabelZ: FRONT_ROW_Z - 1.79,
            screen: {
                width: screenWidth,
                height: screenHeight,
                y: 2 + screenHeight / 2,
                z: FRONT_ROW_Z - 4.95,
            },
            target: new Vector3(0, 0.6 + rows * ROW_RISE * 0.35, floorCenterZ + 0.6),
            shadowExtent: Math.max(bounds.width, bounds.depth) / 2 + 2,
        };
    }, [bounds, rows]);

    const highlightFocus = useMemo(() => {
        const indices = highlight.flatMap((label) => {
            const index = indexByLabel.get(label);

            return index === undefined ? [] : [index];
        });
        const placements = indices.map((index) => layout[index]);

        if (placements.length === 0) return null;

        const xs = placements.map((placement) => placement.x);
        const zs = placements.map((placement) => placement.z);
        const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2;
        const halfSpan = Math.max(
            (Math.max(...xs) - Math.min(...xs)) / 2,
            (Math.max(...zs) - Math.min(...zs)) / 2,
        );

        return {
            indices,
            center: new Vector3(centerX, Math.max(...placements.map((p) => p.y)) + 0.03, centerZ),
            radius: Math.max(1.2, halfSpan + 0.6),
        };
    }, [highlight, indexByLabel, layout]);

    const markerGeometry = useMemo(
        () =>
            highlightFocus
                ? new RingGeometry(highlightFocus.radius, highlightFocus.radius + 0.08, 64)
                : null,
        [highlightFocus],
    );

    const stageTexture = useMemo(
        () =>
            createLabelTexture({
                text: 'STAGE',
                width: 1024,
                height: 256,
                background: '#27272a',
                color: '#e4e4e7',
                size: 110,
                spacing: 0.18,
                maxTextWidth: 900,
                fontFamily,
            }),
        [fontFamily],
    );

    const screenTexture = useMemo(
        () =>
            createLabelTexture({
                text: eventName,
                width: SCREEN_TEXTURE.width,
                height: SCREEN_TEXTURE.height,
                background: '#09090b',
                color: '#fafafa',
                size: SCREEN_TEXTURE.size,
                spacing: SCREEN_TEXTURE.spacing,
                maxTextWidth: SCREEN_TEXTURE.width - SCREEN_TEXTURE.padding * 2,
                fontFamily,
            }),
        [eventName, fontFamily],
    );

    const seatColors = useMemo(() => {
        const bookedColor = variant === 'admin' ? SEAT_COLORS.adminBooked : SEAT_COLORS.booked;
        const palette = {
            available: new Color(SEAT_COLORS.available),
            booked: new Color(bookedColor),
            checkedIn: new Color(SEAT_COLORS.checkedIn),
        };

        return layout.map((placement) => {
            const state = seats[placement.label];

            if (state === 'checkedIn') return palette.checkedIn;
            if (state === 'booked') return palette.booked;

            return palette.available;
        });
    }, [layout, seats, variant]);

    useEffect(() => () => chairGeometry.dispose(), [chairGeometry]);
    useEffect(() => () => rippleGeometry.dispose(), [rippleGeometry]);
    useEffect(() => () => tierMaterial.dispose(), [tierMaterial]);
    useEffect(() => () => markerGeometry?.dispose(), [markerGeometry]);
    useEffect(() => () => stageTexture.dispose(), [stageTexture]);
    useEffect(() => () => screenTexture.dispose(), [screenTexture]);

    useEffect(() => {
        if (isStill) return;

        const trackPointer = (event: PointerEvent) => {
            pointerRef.current.set(
                event.clientX / window.innerWidth - 0.5,
                event.clientY / window.innerHeight - 0.5,
            );
        };

        window.addEventListener('pointermove', trackPointer, { passive: true });

        return () => window.removeEventListener('pointermove', trackPointer);
    }, [isStill]);

    useLayoutEffect(() => {
        const mesh = seatsRef.current;
        if (!mesh) return;

        const placeholder = scratchObject;
        const scale = isRisingRef.current ? 0.001 : 1;

        layout.forEach((placement, index) => {
            placeholder.position.set(placement.x, placement.y, placement.z);
            placeholder.scale.setScalar(scale);
            placeholder.updateMatrix();
            mesh.setMatrixAt(index, placeholder.matrix);
            mesh.setColorAt(index, seatColors[index]);
        });

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        invalidate();
    }, [layout, seatColors, invalidate]);

    useLayoutEffect(() => {
        const mesh = seatsRef.current;

        invalidate();

        if (!mesh || !highlightFocus) return;

        return () => {
            for (const index of highlightFocus.indices) mesh.setColorAt(index, seatColors[index]);

            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        };
    }, [highlightFocus, seatColors, invalidate]);

    useEffect(() => {
        const previousLabels = previousPulseLabelsRef.current;
        previousPulseLabelsRef.current = new Set(pulseLabels);

        if (isStill) return;

        const group = ripplesRef.current;

        for (const label of pulseLabels) {
            const index = indexByLabel.get(label);
            if (previousLabels.has(label) || index === undefined) continue;

            pulsesRef.current.set(index, elapsedRef.current);

            if (!group) continue;

            const placement = layout[index];
            const ripple = new Mesh(
                rippleGeometry,
                new MeshBasicMaterial({
                    color: SEAT_COLORS.glow,
                    transparent: true,
                    opacity: 0.9,
                    side: DoubleSide,
                    depthWrite: false,
                }),
            );

            ripple.rotation.x = -Math.PI / 2;
            ripple.position.set(placement.x, placement.y + 0.05, placement.z);
            ripple.userData.bornAt = elapsedRef.current;
            group.add(ripple);
        }
    }, [pulseLabels, indexByLabel, layout, rippleGeometry, isStill]);

    useFrame((state, delta) => {
        const mesh = seatsRef.current;
        const rippleGroup = ripplesRef.current;
        if (!mesh || !rippleGroup) return;

        if (!isStill) elapsedRef.current += Math.min(delta, MAX_FRAME_SECONDS);

        const time = isStill ? riseTiming.end + 1 : elapsedRef.current;
        const { hallScale, target } = geometry;
        const placeholder = scratchObject;
        const color = scratchColor;
        let matricesChanged = false;
        let colorsChanged = false;

        const desiredFocus = highlightFocus
            ? desiredFocusVector.copy(target).lerp(highlightFocus.center, HIGHLIGHT_GLIDE)
            : desiredFocusVector.copy(target);
        const desiredZoom = highlightFocus ? HIGHLIGHT_ZOOM : 1;

        if (!focusRef.current || isStill) {
            focusRef.current = desiredFocus.clone();
        } else {
            focusRef.current.lerp(
                desiredFocus,
                1 - Math.exp(-Math.min(delta, MAX_FRAME_SECONDS) * 2),
            );
        }

        const camera = state.camera;
        const fov = state.size.width < NARROW_VIEWPORT ? NARROW_FOV : WIDE_FOV;

        if (camera instanceof PerspectiveCamera && camera.fov !== fov) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
        }

        const focus = focusRef.current;
        const pointer = isStill ? stillPointer : pointerRef.current;
        const sway = isStill ? 0 : Math.sin(time * 0.25) * 0.6;

        camera.position.set(
            focus.x + (sway + pointer.x * 1.4) * hallScale,
            focus.y + (CAMERA_OFFSET.y * desiredZoom - pointer.y * 0.8) * hallScale,
            focus.z + CAMERA_OFFSET.z * desiredZoom * hallScale,
        );
        camera.lookAt(focus);

        if (isRisingRef.current) {
            const isDone = time >= riseTiming.end;

            for (let index = 0; index < layout.length; index += 1) {
                const placement = layout[index];
                const localProgress = Math.min(
                    1,
                    Math.max(0, (time - placement.delay * riseTiming.delayScale) / RISE_SECONDS),
                );
                const rise = isDone ? 1 : localProgress === 0 ? 0 : easeOutBack(localProgress);

                placeholder.position.set(placement.x, placement.y, placement.z);
                placeholder.scale.setScalar(Math.max(0.001, rise));
                placeholder.updateMatrix();
                mesh.setMatrixAt(index, placeholder.matrix);
            }

            matricesChanged = true;
            isRisingRef.current = !isDone;
        }

        for (const [index, startedAt] of pulsesRef.current) {
            const placement = layout[index];
            const sincePulse = time - startedAt;
            const isFinished = sincePulse >= GLOW_SECONDS;

            const hop =
                sincePulse < HOP_SECONDS
                    ? Math.sin((sincePulse / HOP_SECONDS) * Math.PI) * HOP_HEIGHT
                    : 0;

            placeholder.position.set(placement.x, placement.y + hop, placement.z);
            placeholder.scale.setScalar(1);
            placeholder.updateMatrix();
            mesh.setMatrixAt(index, placeholder.matrix);

            color.copy(seatColors[index]);
            if (!isFinished) color.lerp(glowColor, 1 - sincePulse / GLOW_SECONDS);
            mesh.setColorAt(index, color);

            if (isFinished) pulsesRef.current.delete(index);

            matricesChanged = true;
            colorsChanged = true;
        }

        if (highlightFocus) {
            const pulse = isStill ? 0 : 0.35 + 0.35 * Math.sin(time * 4);
            color.copy(highlightColor).lerp(highlightDimColor, pulse);

            for (const index of highlightFocus.indices) mesh.setColorAt(index, color);

            colorsChanged = true;

            const markerProgress = Math.min(1, Math.max(0, (time - riseTiming.end) / 0.5));
            const markerOpacity = isStill ? 0.7 : 0.55 + 0.25 * Math.sin(time * 4);

            if (markerMaterialRef.current) {
                markerMaterialRef.current.opacity = markerProgress * markerOpacity;
            }

            markerRef.current?.scale.setScalar(0.6 + markerProgress * 0.4);
        }

        for (
            let rippleIndex = rippleGroup.children.length - 1;
            rippleIndex >= 0;
            rippleIndex -= 1
        ) {
            const ripple = rippleGroup.children[rippleIndex];
            const age = time - (ripple.userData.bornAt as number);
            const material = (ripple as Mesh).material as MeshBasicMaterial;

            ripple.scale.setScalar(1 + age * 2.2);
            material.opacity = Math.max(0, 0.9 - age * 0.9);

            if (age <= RIPPLE_SECONDS) continue;

            ripple.removeFromParent();
            material.dispose();
        }

        if (matricesChanged) mesh.instanceMatrix.needsUpdate = true;
        if (colorsChanged && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });

    return (
        <>
            <color attach="background" args={['#ffffff']} />
            <hemisphereLight args={['#ffffff', '#d4d4d8', 1.15]} />
            <directionalLight
                position={[
                    -8 * geometry.hallScale,
                    20 * geometry.hallScale,
                    14 * geometry.hallScale,
                ]}
                intensity={1.6}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-radius={4}
                shadow-camera-left={-geometry.shadowExtent}
                shadow-camera-right={geometry.shadowExtent}
                shadow-camera-top={geometry.shadowExtent}
                shadow-camera-bottom={-geometry.shadowExtent}
                shadow-camera-far={120 * geometry.hallScale}
            />

            <mesh position={[0, -0.1, geometry.floor.z]} receiveShadow>
                <boxGeometry args={[geometry.floor.width, 0.2, geometry.floor.depth]} />
                <meshStandardMaterial color="#f4f4f5" roughness={0.9} />
            </mesh>

            <mesh position={[0, 0.4, geometry.stage.z]} castShadow receiveShadow>
                <boxGeometry args={[geometry.stage.width, 0.8, 3.2]} />
                <meshStandardMaterial color="#27272a" roughness={0.5} />
            </mesh>

            <mesh position={[0, 0.4, geometry.stageLabelZ]}>
                <planeGeometry args={[4, 0.6]} />
                <meshBasicMaterial map={stageTexture} />
            </mesh>

            <mesh position={[0, geometry.screen.y, geometry.screen.z]}>
                <planeGeometry args={[geometry.screen.width, geometry.screen.height]} />
                <meshBasicMaterial map={screenTexture} />
            </mesh>

            <mesh position={[0, geometry.screen.y, geometry.screen.z - 0.1]} castShadow>
                <boxGeometry
                    args={[geometry.screen.width + 0.4, geometry.screen.height + 0.4, 0.15]}
                />
                <meshStandardMaterial color="#27272a" roughness={0.5} />
            </mesh>

            {Array.from({ length: Math.max(0, rows - 1) }, (_, offset) => {
                const row = offset + 1;
                const tierHeight = row * ROW_RISE;

                return (
                    <mesh
                        key={row}
                        material={tierMaterial}
                        position={[0, tierHeight / 2, FRONT_ROW_Z + row * ROW_SPACING]}
                        castShadow
                        receiveShadow
                    >
                        <boxGeometry args={[bounds.width, tierHeight + 0.02, ROW_SPACING]} />
                    </mesh>
                );
            })}

            <instancedMesh
                key={layout.length}
                ref={seatsRef}
                args={[chairGeometry, undefined, layout.length]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial roughness={0.6} />
            </instancedMesh>

            {highlightFocus && markerGeometry && (
                <mesh
                    ref={markerRef}
                    geometry={markerGeometry}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={highlightFocus.center}
                >
                    <meshBasicMaterial
                        ref={markerMaterialRef}
                        color={SEAT_COLORS.checkedIn}
                        transparent
                        opacity={0}
                        side={DoubleSide}
                    />
                </mesh>
            )}

            <group ref={ripplesRef} />
        </>
    );
}

export function AuditoriumScene({ className, ...props }: AuditoriumProps & { className?: string }) {
    const prefersReducedMotion = useReducedMotion() ?? false;

    return (
        <SceneCanvas
            className={className}
            fallback={
                <AuditoriumFallback
                    rows={props.rows}
                    seatsPerRow={props.seatsPerRow}
                    seats={props.seats}
                    highlight={props.highlight}
                    variant={props.variant}
                />
            }
            camera={{ fov: 32, near: 0.1, far: 1000, position: [0, 15, 21] }}
            shadows
            isStill={prefersReducedMotion}
        >
            <Auditorium {...props} isStill={prefersReducedMotion} />
        </SceneCanvas>
    );
}
