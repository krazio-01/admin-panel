'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LazyMotion, m, MotionConfig, useReducedMotion } from 'motion/react';
import './animations.scss';
import { classNames } from '@/utils/class-names';
import { COUNT_UP_SECONDS, countUpValue, DURATION, EASE_OUT } from '@/utils/motion';

const loadMotionFeatures = () =>
    import('@/components/ui/Animations/motionFeatures').then((module) => module.domAnimation);

function MotionProvider({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={loadMotionFeatures} strict>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </LazyMotion>
    );
}

function CountUp({ value, className }: { value: number; className?: string }) {
    const [shownValue, setShownValue] = useState(value);
    const shownValueRef = useRef(value);

    useEffect(() => {
        const startValue = shownValueRef.current;

        if (startValue === value) return;

        const change = value - startValue;
        const isReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const durationMs = isReduced ? 0 : COUNT_UP_SECONDS * 1000;
        const startedAt = performance.now();
        let frame = 0;

        const step = (now: number) => {
            const progress = durationMs === 0 ? 1 : (now - startedAt) / durationMs;
            const current = startValue + countUpValue(change, progress);

            shownValueRef.current = current;
            setShownValue(current);

            if (progress < 1) frame = requestAnimationFrame(step);
        };

        frame = requestAnimationFrame(step);

        return () => cancelAnimationFrame(frame);
    }, [value]);

    return <span className={classNames('count-up', className)}>{shownValue}</span>;
}

function AnimatedHeight({ className, children }: { className?: string; children: ReactNode }) {
    const prefersReducedMotion = useReducedMotion();
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | 'auto'>('auto');

    useEffect(() => {
        const content = contentRef.current;
        if (!content) return;

        const observer = new ResizeObserver(([entry]) => {
            setHeight(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height);
        });

        observer.observe(content);

        return () => observer.disconnect();
    }, []);

    return (
        <m.div
            className={classNames('animated-height', className)}
            initial={false}
            animate={{ height }}
            transition={
                prefersReducedMotion ? { duration: 0 } : { duration: DURATION.base, ease: EASE_OUT }
            }
        >
            <div ref={contentRef}>{children}</div>
        </m.div>
    );
}

export { AnimatedHeight, CountUp, MotionProvider };
