import type { ComponentProps } from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import './input.scss';
import { classNames } from '@/utils/class-names';

function Input({ className, type, ...props }: ComponentProps<'input'>) {
    return <InputPrimitive type={type} className={classNames('input', className)} {...props} />;
}

export { Input };
