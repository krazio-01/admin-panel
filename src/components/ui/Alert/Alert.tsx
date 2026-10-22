import type { ComponentProps } from 'react';
import './alert.scss';
import { classNames } from '@/utils/class-names';

function Alert({
    className,
    variant = 'default',
    ...props
}: ComponentProps<'div'> & { variant?: 'default' | 'destructive' }) {
    return (
        <div
            role="alert"
            className={classNames('alert', className)}
            data-variant={variant}
            {...props}
        />
    );
}

function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('alert-title', className)} {...props} />;
}

function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('alert-description', className)} {...props} />;
}

function AlertAction({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('alert-action', className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
