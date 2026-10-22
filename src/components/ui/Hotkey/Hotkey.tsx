import type { ComponentProps } from 'react';
import './hotkey.scss';
import { classNames } from '@/utils/class-names';

function Hotkey({ className, ...props }: ComponentProps<'kbd'>) {
    return <kbd className={classNames('hotkey', className)} {...props} />;
}

export { Hotkey };
