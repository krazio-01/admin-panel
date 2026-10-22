'use client';
import type { ComponentProps } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import './dialog.scss';
import { Button } from '@/components/ui/Button/Button';
import { classNames, type WithStringClassName } from '@/utils/class-names';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

function DialogOverlay({
    className,
    ...props
}: WithStringClassName<DialogPrimitive.Backdrop.Props>) {
    return (
        <DialogPrimitive.Backdrop className={classNames('dialog-overlay', className)} {...props} />
    );
}

function DialogContent({
    className,
    children,
    showCloseButton = true,
    ...props
}: WithStringClassName<DialogPrimitive.Popup.Props> & {
    showCloseButton?: boolean;
}) {
    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Popup className={classNames('dialog-content', className)} {...props}>
                {children}
                {showCloseButton && (
                    <DialogPrimitive.Close
                        render={<Button variant="ghost" className="dialog-close" size="icon-sm" />}
                    >
                        <XIcon />
                        <span className="visually-hidden">Close</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Popup>
        </DialogPortal>
    );
}

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('dialog-header', className)} {...props} />;
}

function DialogFooter({
    className,
    showCloseButton = false,
    children,
    ...props
}: ComponentProps<'div'> & {
    showCloseButton?: boolean;
}) {
    return (
        <div className={classNames('dialog-footer', className)} {...props}>
            {children}
            {showCloseButton && (
                <DialogPrimitive.Close render={<Button variant="outline" />}>
                    Close
                </DialogPrimitive.Close>
            )}
        </div>
    );
}

function DialogTitle({ className, ...props }: WithStringClassName<DialogPrimitive.Title.Props>) {
    return <DialogPrimitive.Title className={classNames('dialog-title', className)} {...props} />;
}

function DialogDescription({
    className,
    ...props
}: WithStringClassName<DialogPrimitive.Description.Props>) {
    return (
        <DialogPrimitive.Description
            className={classNames('dialog-description', className)}
            {...props}
        />
    );
}

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
};
