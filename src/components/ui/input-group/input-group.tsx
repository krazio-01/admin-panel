'use client';

import type { ComponentProps } from 'react';
import './input-group.scss';
import { Button } from '@/components/ui/button/button';
import { Input } from '@/components/ui/input/input';
import { Textarea } from '@/components/ui/textarea/textarea';
import { classNames } from '@/utils/class-names';

type InputGroupAddonAlign = 'inline-start' | 'inline-end' | 'block-start' | 'block-end';

type InputGroupButtonSize = 'xs' | 'sm' | 'icon-xs' | 'icon-sm';

function InputGroup({ className, ...props }: ComponentProps<'div'>) {
    return <div role="group" className={classNames('input-group', className)} {...props} />;
}

function InputGroupAddon({
    className,
    align = 'inline-start',
    onClick,
    ...props
}: ComponentProps<'div'> & { align?: InputGroupAddonAlign }) {
    return (
        <div
            className={classNames('input-group__addon', `input-group__addon--${align}`, className)}
            onClick={(event) => {
                onClick?.(event);

                if ((event.target as HTMLElement).closest('button')) return;

                event.currentTarget.parentElement
                    ?.querySelector<HTMLElement>('.input-group__control')
                    ?.focus();
            }}
            {...props}
        />
    );
}

function InputGroupButton({
    className,
    type = 'button',
    variant = 'ghost',
    size = 'xs',
    ...props
}: Omit<ComponentProps<typeof Button>, 'className' | 'size' | 'type'> & {
    className?: string;
    size?: InputGroupButtonSize;
    type?: 'button' | 'submit' | 'reset';
}) {
    return (
        <Button
            type={type}
            variant={variant}
            size={size}
            className={classNames('input-group__button', className)}
            {...props}
        />
    );
}

function InputGroupText({ className, ...props }: ComponentProps<'span'>) {
    return <span className={classNames('input-group__text', className)} {...props} />;
}

function InputGroupInput({ className, ...props }: ComponentProps<'input'>) {
    return <Input className={classNames('input-group__control', className)} {...props} />;
}

function InputGroupTextarea({ className, ...props }: ComponentProps<'textarea'>) {
    return <Textarea className={classNames('input-group__control', className)} {...props} />;
}

export {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
    InputGroupInput,
    InputGroupTextarea,
};
