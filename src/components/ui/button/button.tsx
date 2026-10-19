import { Button as ButtonPrimitive } from '@base-ui/react/button';
import './button.scss';
import { classNames, type WithStringClassName } from '@/utils/class-names';

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';

type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';

function Button({
    className,
    variant = 'default',
    size = 'default',
    ...props
}: WithStringClassName<ButtonPrimitive.Props> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
}) {
    return (
        <ButtonPrimitive
            className={classNames('button', `button--${variant}`, `button--${size}`, className)}
            {...props}
        />
    );
}

export { Button };
export type { ButtonSize, ButtonVariant };
