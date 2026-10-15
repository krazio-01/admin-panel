'use client';

import type { ComponentProps } from 'react';
import './table.scss';
import { classNames } from '@/utils/class-names';

function Table({ className, ...props }: ComponentProps<'table'>) {
    return (
        <div className="table-container">
            <table className={classNames('table', className)} {...props} />
        </div>
    );
}

function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
    return <thead className={classNames('table__header', className)} {...props} />;
}

function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
    return <tbody className={classNames('table__body', className)} {...props} />;
}

function TableFooter({ className, ...props }: ComponentProps<'tfoot'>) {
    return <tfoot className={classNames('table__footer', className)} {...props} />;
}

function TableRow({ className, ...props }: ComponentProps<'tr'>) {
    return <tr className={classNames('table__row', className)} {...props} />;
}

function TableHead({ className, ...props }: ComponentProps<'th'>) {
    return <th className={classNames('table__head', className)} {...props} />;
}

function TableCell({ className, ...props }: ComponentProps<'td'>) {
    return <td className={classNames('table__cell', className)} {...props} />;
}

function TableCaption({ className, ...props }: ComponentProps<'caption'>) {
    return <caption className={classNames('table__caption', className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
