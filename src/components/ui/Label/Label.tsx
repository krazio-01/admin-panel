import type { ComponentProps } from 'react';
import './label.scss';
import { classNames } from '@/utils/class-names';

function Label({ className, ...props }: ComponentProps<'label'>) {
    return <label className={classNames('label', className)} {...props} />;
}

export { Label };
