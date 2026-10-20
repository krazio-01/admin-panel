'use client';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type CameraProps } from '@react-three/fiber';
import { WebGLRenderer } from 'three';
import './scene-canvas.scss';
import { classNames } from '@/utils/class-names';

const MAX_PIXEL_RATIO = 1.75;
const SLOW_FRAME_SECONDS = 0.02;
const SLOW_STREAK_SECONDS = 1;
const IGNORED_GAP_SECONDS = 0.25;

let cachedWebglSupport: boolean | null = null;

function detectWebglSupport(): boolean {
    if (cachedWebglSupport !== null) return cachedWebglSupport;

    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2') ?? probe.getContext('webgl');
    cachedWebglSupport = context !== null;

    context?.getExtension('WEBGL_lose_context')?.loseContext();

    return cachedWebglSupport;
}

function subscribeToNothing() {
    return () => undefined;
}

function FrameloopController({ isActive, isStill }: { isActive: boolean; isStill: boolean }) {
    const setFrameloop = useThree((state) => state.setFrameloop);
    const invalidate = useThree((state) => state.invalidate);

    useEffect(() => {
        if (!isActive) {
            setFrameloop('never');
            return;
        }

        setFrameloop(isStill ? 'demand' : 'always');
        invalidate();
    }, [isActive, isStill, setFrameloop, invalidate]);

    return null;
}

function PixelRatioGovernor({ onSustainedSlowFrames }: { onSustainedSlowFrames: () => void }) {
    const slowStreakRef = useRef(0);
    const hasDroppedRef = useRef(false);

    useFrame((_state, delta) => {
        if (hasDroppedRef.current) return;

        const isSlowFrame = delta > SLOW_FRAME_SECONDS && delta < IGNORED_GAP_SECONDS;
        slowStreakRef.current = isSlowFrame ? slowStreakRef.current + delta : 0;

        if (slowStreakRef.current < SLOW_STREAK_SECONDS) return;

        hasDroppedRef.current = true;
        onSustainedSlowFrames();
    });

    return null;
}

export function SceneCanvas({
    fallback,
    className,
    camera,
    shadows = false,
    transparent = false,
    isStill = false,
    children,
}: {
    fallback: ReactNode;
    className?: string;
    camera?: CameraProps;
    shadows?: boolean;
    transparent?: boolean;
    isStill?: boolean;
    children: ReactNode;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isOnScreen, setIsOnScreen] = useState(true);
    const [isTabVisible, setIsTabVisible] = useState(true);
    const [isContextLost, setIsContextLost] = useState(false);
    const [maxPixelRatio, setMaxPixelRatio] = useState(MAX_PIXEL_RATIO);

    const supportsWebgl = useSyncExternalStore(subscribeToNothing, detectWebglSupport, () => false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsOnScreen(entry.isIntersecting);
        });

        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const updateVisibility = () => setIsTabVisible(!document.hidden);

        updateVisibility();
        document.addEventListener('visibilitychange', updateVisibility);

        return () => document.removeEventListener('visibilitychange', updateVisibility);
    }, []);

    const showsFallback = !supportsWebgl || isContextLost;

    return (
        <div ref={containerRef} className={classNames('scene-canvas', className)}>
            {showsFallback ? (
                fallback
            ) : (
                <Canvas
                    aria-hidden="true"
                    className="scene-canvas__canvas"
                    camera={camera}
                    shadows={shadows}
                    flat
                    dpr={[1, maxPixelRatio]}
                    gl={({ canvas }) =>
                        new WebGLRenderer({ canvas, antialias: true, alpha: transparent })
                    }
                    onCreated={({ gl }) => {
                        gl.domElement.setAttribute('aria-hidden', 'true');
                        gl.domElement.addEventListener('webglcontextlost', () =>
                            setIsContextLost(true),
                        );
                    }}
                >
                    <FrameloopController isActive={isOnScreen && isTabVisible} isStill={isStill} />
                    <PixelRatioGovernor onSustainedSlowFrames={() => setMaxPixelRatio(1)} />
                    {children}
                </Canvas>
            )}
        </div>
    );
}
