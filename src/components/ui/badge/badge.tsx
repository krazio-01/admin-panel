import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import './badge.scss';
import { classNames } from '@/utils/class-names';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';

function Badge({
    className,
    variant = 'default',
    render,
    ...props
}: useRender.ComponentProps<'span'> & { variant?: BadgeVariant }) {
    return useRender({
        defaultTagName: 'span',
        props: mergeProps<'span'>(
            { className: classNames('badge', `badge--${variant}`, className) },
            props,
        ),
        render,
    });
}

export { Badge };
export type { BadgeVariant };
