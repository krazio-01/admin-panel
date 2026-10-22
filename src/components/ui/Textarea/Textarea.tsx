import type { ComponentProps } from 'react';
import './textarea.scss';
import { classNames } from '@/utils/class-names';

function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
    return <textarea className={classNames('textarea', className)} {...props} />;
}

export { Textarea };
