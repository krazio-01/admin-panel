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
            className={classNames(
                'card',
                size === 'sm' && 'card--sm',
                raised && 'card--raised',
                className,
            )}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('card__header', className)} {...props} />;
}

function CardTitle({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('card__title', className)} {...props} />;
}

function CardDescription({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('card__description', className)} {...props} />;
}

function CardAction({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('card__action', className)} {...props} />;
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('card__content', className)} {...props} />;
}

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('card__footer', className)} {...props} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
