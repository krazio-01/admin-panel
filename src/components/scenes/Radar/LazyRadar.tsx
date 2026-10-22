'use client';
import dynamic from 'next/dynamic';
import { RadarFallback } from '@/components/scenes/RadarFallback/RadarFallback';

export const LazyRadar = dynamic(
    () => import('@/components/scenes/Radar/Radar').then((module) => module.Radar),
    { ssr: false, loading: () => <RadarFallback /> },
);
