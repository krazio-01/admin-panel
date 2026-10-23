'use client';
import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import './segmentedControl.scss';
import { classNames } from '@/utils/class-names';

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
    const rootRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const selectedIndex = options.findIndex((option) => option.value === value);

    useLayoutEffect(() => {
        const root = rootRef.current;

        if (!root) return;

        const placeIndicator = () => {
            const selected = optionRefs.current[selectedIndex];

            if (!selected) return;

            root.style.setProperty('--segmented-control-offset', `${selected.offsetLeft}px`);
            root.style.setProperty('--segmented-control-width', `${selected.offsetWidth}px`);

            if (root.dataset.measured) return;

            void root.offsetWidth;
            root.dataset.measured = 'true';
        };

        placeIndicator();

        const observer = new ResizeObserver(placeIndicator);

        observer.observe(root);

        return () => observer.disconnect();
    }, [selectedIndex]);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const step = NEXT_KEYS.includes(event.key) ? 1 : PREVIOUS_KEYS.includes(event.key) ? -1 : 0;
        if (step === 0) return;

        event.preventDefault();

        const nextIndex = (selectedIndex + step + options.length) % options.length;

        onValueChange(options[nextIndex].value);
        optionRefs.current[nextIndex]?.focus();
    };

    return (
        <div
            ref={rootRef}
            role="radiogroup"
            aria-label={ariaLabel}
            className={classNames('segmented-control', className)}
            onKeyDown={handleKeyDown}
        >
            <span className="segmented-control-highlight" aria-hidden="true" />
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
                        <span className="segmented-control-label">{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export { SegmentedControl };
export type { SegmentedControlOption };
