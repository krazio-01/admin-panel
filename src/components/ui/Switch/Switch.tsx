'use client';
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import './switch.scss';
import { classNames, type WithStringClassName } from '@/utils/class-names';

function Switch({ className, ...props }: WithStringClassName<SwitchPrimitive.Root.Props>) {
    return (
        <SwitchPrimitive.Root className={classNames('switch', className)} {...props}>
            <SwitchPrimitive.Thumb className="switch-thumb" />
        </SwitchPrimitive.Root>
    );
}

export { Switch };
