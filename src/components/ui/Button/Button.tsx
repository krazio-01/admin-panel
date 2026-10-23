import type { ComponentProps } from 'react';
import Link from 'next/link';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import './button.scss';
import { classNames, type WithStringClassName } from '@/utils/class-names';

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';

type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';

function Button({
    className,
    variant = 'default',
    size = 'default',
    loading = false,
    disabled,
    children,
    ...props
}: WithStringClassName<ButtonPrimitive.Props> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
}) {
    return (
        <ButtonPrimitive
            className={classNames('button', className)}
            data-variant={variant}
            data-size={size}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...props}
        >
            {loading ? (
                <>
                    <span className="button-label">{children}</span>
                    <span className="button-spinner" aria-hidden="true" />
                </>
            ) : (
                children
            )}
        </ButtonPrimitive>
    );
}

function ButtonLink({
    className,
    variant = 'default',
    size = 'default',
    ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
    return (
        <Link
            className={classNames('button', className)}
            data-variant={variant}
            data-size={size}
            {...props}
        />
    );
}

export { Button, ButtonLink };
export type { ButtonSize, ButtonVariant };
