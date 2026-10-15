'use client';

import type { ComponentProps } from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import './popover.scss';
import { classNames } from '@/utils/class-names';

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
    return <PopoverPrimitive.Root {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
    return <PopoverPrimitive.Trigger {...props} />;
}

function PopoverContent({
    className,
    align = 'center',
    alignOffset = 0,
    side = 'bottom',
    sideOffset = 4,
    ...props
}: Omit<PopoverPrimitive.Popup.Props, 'className'> & {
    className?: string;
} & Pick<PopoverPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
                className="popover__positioner"
            >
                <PopoverPrimitive.Popup
                    className={classNames('popover__content', className)}
                    {...props}
                />
            </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
    );
}

function PopoverHeader({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('popover__header', className)} {...props} />;
}

function PopoverTitle({
    className,
    ...props
}: Omit<PopoverPrimitive.Title.Props, 'className'> & { className?: string }) {
    return (
        <PopoverPrimitive.Title className={classNames('popover__title', className)} {...props} />
    );
}

function PopoverDescription({
    className,
    ...props
}: Omit<PopoverPrimitive.Description.Props, 'className'> & { className?: string }) {
    return (
        <PopoverPrimitive.Description
            className={classNames('popover__description', className)}
            {...props}
        />
    );
}

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
