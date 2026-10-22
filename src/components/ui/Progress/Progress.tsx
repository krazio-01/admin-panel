'use client';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';
import './progress.scss';
import { classNames } from '@/utils/class-names';

function Progress({
    value,
    className,
    'aria-label': ariaLabel,
}: {
    value: number;
    className?: string;
    'aria-label'?: string;
}) {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
        <ProgressPrimitive.Root
            value={clampedValue}
            aria-label={ariaLabel}
            className={classNames('progress', className)}
        >
            <ProgressPrimitive.Track className="progress-track">
                <ProgressPrimitive.Indicator className="progress-indicator" />
            </ProgressPrimitive.Track>
        </ProgressPrimitive.Root>
    );
}

export { Progress };
