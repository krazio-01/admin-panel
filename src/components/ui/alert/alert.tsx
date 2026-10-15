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
            className={classNames(
                'alert',
                variant === 'destructive' && 'alert--destructive',
                className,
            )}
            {...props}
        />
    );
}

function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('alert__title', className)} {...props} />;
}

function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('alert__description', className)} {...props} />;
}

function AlertAction({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('alert__action', className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
