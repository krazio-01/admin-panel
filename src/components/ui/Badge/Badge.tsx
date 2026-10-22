import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import './badge.scss';
import { classNames } from '@/utils/class-names';

type BadgeVariant =
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'ghost'
    | 'link'
    | 'success'
    | 'pending'
    | 'failed'
    | 'solid';

function Badge({
    className,
    variant = 'default',
    render,
    ...props
}: useRender.ComponentProps<'span'> & { variant?: BadgeVariant }) {
    const badgeProps = { className: classNames('badge', className), 'data-variant': variant };

    return useRender({
        defaultTagName: 'span',
        props: mergeProps<'span'>(badgeProps, props),
        render,
    });
}

export { Badge };
export type { BadgeVariant };
