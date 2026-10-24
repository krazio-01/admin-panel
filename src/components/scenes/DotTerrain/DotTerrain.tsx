'use client';
import { useRef, useState, type ReactNode } from 'react';
import './dotTerrain.scss';
import { LazyDotTerrainScene, useSceneGate } from '@/components/scenes/LazyScenes';
import { classNames } from '@/utils/class-names';

export function DotTerrain({
    isFullScreen = false,
    className,
    children,
}: {
    isFullScreen?: boolean;
    className?: string;
    children: ReactNode;
}) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isSceneReady, setIsSceneReady] = useState(false);

    const shouldLoadScene = useSceneGate();

    return (
        <div
            className={classNames('dot-terrain', className)}
            data-scene="dot-terrain"
            data-full-screen={isFullScreen || undefined}
            data-scene-ready={isSceneReady || undefined}
        >
            <div className="dot-terrain-backdrop" aria-hidden="true">
                <div className="dot-terrain-fallback">
                    <div className="dot-terrain-fallback-plane" />
                </div>

                {shouldLoadScene && (
                    <LazyDotTerrainScene
                        className="dot-terrain-canvas"
                        maskRef={contentRef}
                        onFirstFrame={() => setIsSceneReady(true)}
                    />
                )}
            </div>

            <div ref={contentRef} className="dot-terrain-content">
                {children}
            </div>
        </div>
    );
}
