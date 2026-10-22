'use client';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import './fieldError.scss';
import { DURATION, EASE_OUT } from '@/utils/motion';

export function FieldError({ id, message }: { id: string; message?: string }) {
    const prefersReducedMotion = useReducedMotion();

    return (
        <div className="field-error-live-region" aria-live="polite">
            <AnimatePresence initial={false}>
                {message && (
                    <m.p
                        key="error"
                        id={id}
                        className="field-error"
                        initial={{ opacity: 0, y: -4, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -4, height: 0 }}
                        transition={
                            prefersReducedMotion
                                ? { duration: 0 }
                                : { duration: DURATION.fast, ease: EASE_OUT }
                        }
                    >
                        {message}
                    </m.p>
                )}
            </AnimatePresence>
        </div>
    );
}
