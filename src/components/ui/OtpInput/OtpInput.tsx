'use client';
import { useEffect, useRef, useState } from 'react';
import './otpInput.scss';
import { VERIFICATION_CODE_LENGTH } from '@/types/booking';

const SHAKE_KEYFRAMES = [0, -8, 8, -6, 6, -3, 3, 0].map((offset) => ({
    transform: `translateX(${offset}px)`,
}));
const SHAKE_MS = 400;

export function OtpInput({
    id,
    value,
    onChange,
    onComplete,
    shakeSignal,
    invalid = false,
    readOnly = false,
    describedBy,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    onComplete?: (code: string) => void;
    shakeSignal: number;
    invalid?: boolean;
    readOnly?: boolean;
    describedBy?: string;
}) {
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (shakeSignal === 0) return;

        inputRef.current?.focus();

        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const shake = containerRef.current?.animate(SHAKE_KEYFRAMES, {
            duration: SHAKE_MS,
            easing: 'ease-out',
        });

        return () => shake?.cancel();
    }, [shakeSignal]);

    const activeSlot = Math.min(value.length, VERIFICATION_CODE_LENGTH - 1);

    return (
        <div
            ref={containerRef}
            className="otp-input"
            data-invalid={invalid || undefined}
            data-otp-shake={shakeSignal}
        >
            <input
                ref={inputRef}
                id={id}
                className="otp-input-control"
                value={value}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={VERIFICATION_CODE_LENGTH}
                readOnly={readOnly}
                aria-busy={readOnly || undefined}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(event) => {
                    const digits = event.target.value
                        .replace(/\D/g, '')
                        .slice(0, VERIFICATION_CODE_LENGTH);

                    onChange(digits);

                    if (digits.length === VERIFICATION_CODE_LENGTH) onComplete?.(digits);
                }}
            />

            {Array.from({ length: VERIFICATION_CODE_LENGTH }, (_, index) => (
                <span
                    key={index}
                    aria-hidden="true"
                    className="otp-input-slot"
                    data-active={(isFocused && index === activeSlot) || undefined}
                    data-filled={Boolean(value[index]) || undefined}
                >
                    {value[index] ?? ''}
                </span>
            ))}
        </div>
    );
}
