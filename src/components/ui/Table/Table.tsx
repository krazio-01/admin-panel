import type { ComponentProps } from 'react';
import { SearchIcon } from 'lucide-react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import './table.scss';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { classNames } from '@/utils/class-names';

type TablePageRange = { page: number; pageSize: number; total: number; itemCount: number };

function describeTableRange({ page, pageSize, total, itemCount }: TablePageRange): string {
    const firstShown = itemCount ? (page - 1) * pageSize + 1 : 0;
    const lastShown = firstShown + Math.max(itemCount - 1, 0);

    return `Showing ${firstShown}–${lastShown} of ${total}`;
}

function Table({ className, ...props }: ComponentProps<'table'>) {
    return (
        <div className="table-container">
            <table className={classNames('table', className)} {...props} />
        </div>
    );
}

function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
    return <thead className={classNames('table-header', className)} {...props} />;
}

function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
    return <tbody className={classNames('table-body', className)} {...props} />;
}

function TableFooter({ className, ...props }: ComponentProps<'tfoot'>) {
    return <tfoot className={classNames('table-footer', className)} {...props} />;
}

function TableRow({ className, render, ...props }: useRender.ComponentProps<'tr'>) {
    return useRender({
        defaultTagName: 'tr',
        props: mergeProps<'tr'>({ className: classNames('table-row', className) }, props),
        render,
    });
}

function TableHead({ className, ...props }: ComponentProps<'th'>) {
    return <th className={classNames('table-head-cell', className)} {...props} />;
}

function TableCell({ className, ...props }: ComponentProps<'td'>) {
    return <td className={classNames('table-cell', className)} {...props} />;
}

function TableCaption({ className, ...props }: ComponentProps<'caption'>) {
    return <caption className={classNames('table-caption', className)} {...props} />;
}

function TableToolbar({ className, ...props }: ComponentProps<'div'>) {
    return <div className={classNames('table-toolbar', className)} {...props} />;
}

function TableSearch({
    label,
    className,
    ...props
}: Omit<ComponentProps<'input'>, 'type'> & { label: string }) {
    return (
        <div className={classNames('table-search', className)}>
            <SearchIcon aria-hidden="true" className="table-search-icon" />
            <Input type="search" aria-label={label} {...props} />
        </div>
    );
}

function TablePagination({
    range,
    pageNumber,
    isBusy = false,
    loadingLabel,
    announcement,
    onPageChange,
}: {
    range: TablePageRange | null;
    pageNumber: number;
    isBusy?: boolean;
    loadingLabel: string;
    announcement?: string;
    onPageChange: (page: number) => void;
}) {
    const hasNextPage = range && !isBusy ? range.page * range.pageSize < range.total : false;

    return (
        <div className="table-pagination">
            <span>{range ? describeTableRange(range) : loadingLabel}</span>
            <span className="visually-hidden" aria-live="polite">
                {announcement}
            </span>

            <div className="table-pagination-pages">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={pageNumber <= 1 || isBusy}
                    onClick={() => onPageChange(pageNumber - 1)}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage}
                    onClick={() => onPageChange(pageNumber + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}

export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
    TablePagination,
    TableSearch,
    TableToolbar,
    describeTableRange,
};
export type { TablePageRange };
