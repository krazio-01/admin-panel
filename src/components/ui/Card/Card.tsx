import type { ComponentProps } from 'react';
import './card.scss';
import { classNames } from '@/utils/class-names';

function Card({
    className,
    size = 'default',
    raised = false,
    ...props
}: ComponentProps<'div'> & { size?: 'default' | 'sm'; raised?: boolean }) {
    return (
        <div
            className={classNames('card', className)}
            data-size={size}
            data-raised={raised || undefined}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('card-header', className)} {...props} />;
}

function CardTitle({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('card-title', className)} {...props} />;
}

function CardDescription({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('card-description', className)} {...props} />;
}

function CardAction({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('card-action', className)} {...props} />;
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('card-content', className)} {...props} />;
}

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('card-footer', className)} {...props} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
