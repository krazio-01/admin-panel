'use client';

import type { ComponentProps } from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import './popover.scss';
import { classNames, type WithStringClassName } from '@/utils/class-names';

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

function PopoverContent({
    className,
    align = 'center',
    alignOffset = 0,
    side = 'bottom',
    sideOffset = 4,
    ...props
}: WithStringClassName<PopoverPrimitive.Popup.Props> &
    Pick<PopoverPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
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

function PopoverTitle({ className, ...props }: WithStringClassName<PopoverPrimitive.Title.Props>) {
    return (
        <PopoverPrimitive.Title className={classNames('popover__title', className)} {...props} />
    );
}

function PopoverDescription({
    className,
    ...props
}: WithStringClassName<PopoverPrimitive.Description.Props>) {
    return (
        <PopoverPrimitive.Description
            className={classNames('popover__description', className)}
            {...props}
        />
    );
}

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
