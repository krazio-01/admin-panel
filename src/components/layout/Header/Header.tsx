import type { ReactNode } from 'react';
import './header.scss';
import { classNames } from '@/utils/class-names';

export function Header({
    start,
    end,
    className,
}: {
    start?: ReactNode;
    end?: ReactNode;
    className?: string;
}) {
    return (
        <header className={classNames('header', className)}>
            <div className="header-start">{start}</div>
            <div className="header-end">{end}</div>
        </header>
    );
}
