'use client';
import { createElement } from 'react';
import dynamic from 'next/dynamic';
import { AuditoriumFallback } from '@/components/scenes/auditorium-fallback/auditorium-fallback';
import { RadarFallback } from '@/components/scenes/radar-fallback/radar-fallback';

export const LazyAuditorium = dynamic(
    () =>
        import('@/components/scenes/auditorium/auditorium').then(
            (module) => module.AuditoriumScene,
        ),
    { ssr: false, loading: () => createElement(AuditoriumFallback) },
);

export const LazyFlypast = dynamic(
    () => import('@/components/scenes/flypast/flypast').then((module) => module.Flypast),
    { ssr: false, loading: () => null },
);

export const LazyRadar = dynamic(
    () => import('@/components/scenes/radar/radar').then((module) => module.Radar),
    { ssr: false, loading: () => createElement(RadarFallback) },
);
