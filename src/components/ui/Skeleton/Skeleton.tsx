import type { ComponentProps, CSSProperties } from 'react';
import './skeleton.scss';
import { classNames } from '@/utils/class-names';

function Skeleton({
    width,
    height,
    className,
    style,
    ...props
}: ComponentProps<'div'> & {
    width?: CSSProperties['width'];
    height?: CSSProperties['height'];
}) {
    return (
        <div
            aria-hidden="true"
            className={classNames('skeleton', className)}
            style={{ width, height, ...style }}
            {...props}
        />
    );
}

export { Skeleton };
