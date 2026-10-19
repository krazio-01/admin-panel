'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { CheckIcon, SearchIcon } from 'lucide-react';
import './command.scss';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog/dialog';
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group/input-group';
import { classNames } from '@/utils/class-names';

function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
    return <CommandPrimitive className={classNames('command', className)} {...props} />;
}

function CommandDialog({
    title = 'Command Palette',
    description = 'Search for a command to run...',
    children,
    className,
    showCloseButton = false,
    ...props
}: Omit<ComponentProps<typeof Dialog>, 'children'> & {
    title?: string;
    description?: string;
    className?: string;
    showCloseButton?: boolean;
    children: ReactNode;
}) {
    return (
        <Dialog {...props}>
            <DialogContent
                className={classNames('command__dialog', className)}
                showCloseButton={showCloseButton}
            >
                <DialogHeader className="command__sr-only">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    );
}

function CommandInput({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) {
    return (
        <div className="command__input-wrapper">
            <InputGroup>
                <CommandPrimitive.Input
                    className={classNames('input-group__control', 'command__input', className)}
                    {...props}
                />
                <InputGroupAddon>
                    <SearchIcon className="command__search-icon" />
                </InputGroupAddon>
            </InputGroup>
        </div>
    );
}

function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
    return <CommandPrimitive.List className={classNames('command__list', className)} {...props} />;
}

function CommandEmpty({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) {
    return (
        <CommandPrimitive.Empty className={classNames('command__empty', className)} {...props} />
    );
}

function CommandGroup({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) {
    return (
        <CommandPrimitive.Group className={classNames('command__group', className)} {...props} />
    );
}

function CommandSeparator({
    className,
    ...props
}: ComponentProps<typeof CommandPrimitive.Separator>) {
    return (
        <CommandPrimitive.Separator
            className={classNames('command__separator', className)}
            {...props}
        />
    );
}

function CommandItem({
    className,
    children,
    ...props
}: ComponentProps<typeof CommandPrimitive.Item>) {
    return (
        <CommandPrimitive.Item className={classNames('command__item', className)} {...props}>
            {children}
            <CheckIcon className="command__check" />
        </CommandPrimitive.Item>
    );
}

function CommandShortcut({ className, ...props }: ComponentProps<'span'>) {
    return <span className={classNames('command__shortcut', className)} {...props} />;
}

export {
    Command,
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandShortcut,
    CommandSeparator,
};
