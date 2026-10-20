'use client';
import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import {
    animate,
    motion,
    useMotionValue,
    useReducedMotion,
    useTransform,
    type Variants,
} from 'motion/react';
import './animations.scss';
import { classNames } from '@/utils/class-names';
import {
    COUNT_UP_DURATION,
    countUpValue,
    DURATION,
    EASE_OUT,
    LETTER_INTERVAL,
    STAGGER_INTERVAL,
} from '@/utils/motion';

const REVEAL_RISE_PX = 10;

const revealVariants: Variants = {
    hidden: { opacity: 0, y: REVEAL_RISE_PX },
    visible: { opacity: 1, y: 0 },
};

const letterVariants: Variants = {
    hidden: { opacity: 0, y: '0.35em', filter: 'blur(8px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

function Reveal({
    delay = 0,
    className,
    children,
}: {
    delay?: number;
    className?: string;
    children: ReactNode;
}) {
    const prefersReducedMotion = useReducedMotion();

    return (
        <motion.div
            className={classNames('reveal', className)}
            variants={revealVariants}
            initial="hidden"
            animate="visible"
            transition={
                prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: DURATION.slow, ease: EASE_OUT, delay }
            }
        >
            {children}
        </motion.div>
    );
}

function Stagger({ className, children }: { className?: string; children: ReactNode }) {
    const prefersReducedMotion = useReducedMotion();

    const itemTransition = prefersReducedMotion
        ? { duration: 0 }
        : { duration: DURATION.slow, ease: EASE_OUT };

    return (
        <motion.div
            className={classNames('stagger', className)}
            initial="hidden"
            animate="visible"
            variants={{
                hidden: {},
                visible: {
                    transition: { staggerChildren: prefersReducedMotion ? 0 : STAGGER_INTERVAL },
                },
            }}
        >
            {Children.toArray(children).map((child, index) => (
                <motion.div
                    key={index}
                    className="reveal"
                    variants={revealVariants}
                    transition={itemTransition}
                >
                    {child}
                </motion.div>
            ))}
        </motion.div>
    );
}

function CountUp({ value, className }: { value: number; className?: string }) {
    const prefersReducedMotion = useReducedMotion();
    const currentValue = useMotionValue(value);
    const roundedValue = useTransform(currentValue, (latest) => Math.round(latest));
    const hasStartedRef = useRef(false);
    const elementRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const element = elementRef.current;
        const revealElement = () => element?.removeAttribute('data-count-pending');

        const isFirstRun = !hasStartedRef.current;
        hasStartedRef.current = true;

        if (prefersReducedMotion) {
            currentValue.set(value);
            revealElement();
            return;
        }

        const startValue = isFirstRun ? 0 : currentValue.get();

        if (startValue === value) {
            revealElement();
            return;
        }

        const change = value - startValue;
        const duration = isFirstRun ? COUNT_UP_DURATION.first : COUNT_UP_DURATION.change;

        currentValue.set(startValue);

        const controls = animate(0, 1, {
            duration,
            ease: 'linear',
            onUpdate: (progress) => {
                currentValue.set(startValue + countUpValue(change, progress));
                revealElement();
            },
        });

        return () => controls.stop();
    }, [value, prefersReducedMotion, currentValue]);

    return (
        <motion.span
            ref={elementRef}
            data-count-pending=""
            className={classNames('count-up', className)}
        >
            {roundedValue}
        </motion.span>
    );
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
        <motion.div
            className={classNames('animated-height', className)}
            initial={false}
            animate={{ height }}
            transition={
                prefersReducedMotion ? { duration: 0 } : { duration: DURATION.base, ease: EASE_OUT }
            }
        >
            <div ref={contentRef}>{children}</div>
        </motion.div>
    );
}

function SplitReveal({ text, className }: { text: string; className?: string }) {
    const prefersReducedMotion = useReducedMotion();

    const letterTransition = prefersReducedMotion
        ? { duration: 0 }
        : { duration: DURATION.slow, ease: EASE_OUT };

    return (
        <motion.span
            className={classNames('split-reveal', className)}
            initial="hidden"
            animate="visible"
            variants={{
                hidden: {},
                visible: {
                    transition: { staggerChildren: prefersReducedMotion ? 0 : LETTER_INTERVAL },
                },
            }}
        >
            <span className="split-reveal__text">{text}</span>
            {Array.from(text).map((letter, index) => (
                <motion.span
                    key={index}
                    aria-hidden="true"
                    className="split-reveal__letter"
                    variants={letterVariants}
                    transition={letterTransition}
                >
                    {letter === ' ' ? ' ' : letter}
                </motion.span>
            ))}
        </motion.span>
    );
}

export { AnimatedHeight, CountUp, Reveal, SplitReveal, Stagger, useReducedMotion };
