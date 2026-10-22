'use client';
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import './segmentedControl.scss';
import { classNames } from '@/utils/class-names';
import { DURATION, EASE_OUT } from '@/utils/motion';

type SegmentedControlOption<Value extends string> = { value: Value; label: ReactNode };

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];

function SegmentedControl<Value extends string>({
    options,
    value,
    onValueChange,
    className,
    'aria-label': ariaLabel,
}: {
    options: SegmentedControlOption<Value>[];
    value: Value;
    onValueChange: (value: Value) => void;
    className?: string;
    'aria-label'?: string;
}) {
    const indicatorId = useId();
    const prefersReducedMotion = useReducedMotion();
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const step = NEXT_KEYS.includes(event.key) ? 1 : PREVIOUS_KEYS.includes(event.key) ? -1 : 0;
        if (step === 0) return;

        event.preventDefault();

        const currentIndex = options.findIndex((option) => option.value === value);
        const nextIndex = (currentIndex + step + options.length) % options.length;

        onValueChange(options[nextIndex].value);
        optionRefs.current[nextIndex]?.focus();
    };

    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className={classNames('segmented-control', className)}
            onKeyDown={handleKeyDown}
        >
            {options.map((option, index) => {
                const isSelected = option.value === value;

                return (
                    <button
                        key={option.value}
                        ref={(element) => {
                            optionRefs.current[index] = element;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        className="segmented-control-option"
                        onClick={() => onValueChange(option.value)}
                    >
                        {isSelected && (
                            <motion.span
                                layoutId={indicatorId}
                                className="segmented-control-highlight"
                                transition={{
                                    duration: prefersReducedMotion ? 0 : DURATION.base,
                                    ease: EASE_OUT,
                                }}
                            />
                        )}
                        <span className="segmented-control-label">{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export { SegmentedControl };
export type { SegmentedControlOption };
