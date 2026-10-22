import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import './separator.scss';
import { classNames, type WithStringClassName } from '@/utils/class-names';

function Separator({
    className,
    orientation = 'horizontal',
    ...props
}: WithStringClassName<SeparatorPrimitive.Props>) {
    return (
        <SeparatorPrimitive
            orientation={orientation}
            className={classNames('separator', className)}
            {...props}
        />
    );
}

export { Separator };
