import type { ReactNode } from 'react';
import './emptyState.scss';
import { classNames } from '@/utils/class-names';

type EmptyStatePreview = { name: string; status: string; message: string };

type EmptyStateSize = 'regular' | 'compact';

type EmptyStateProps = {
    title: string;
    description?: string;
    preview: EmptyStatePreview;
    actions?: ReactNode;
    size?: EmptyStateSize;
    className?: string;
};

function EmptyState({
    title,
    description,
    preview,
    actions,
    size = 'regular',
    className,
}: EmptyStateProps) {
    return (
        <div className={classNames('empty-state', className)} data-size={size}>
            <div className="empty-state-window" aria-hidden="true">
                <div className="empty-state-window-bar">
                    <i />
                    <i />
                    <i />
                </div>

                <div className="empty-state-window-body">
                    <span className="empty-state-window-line">
                        <b>{preview.name}</b> · {preview.status}
                    </span>
                    <span className="empty-state-window-line">
                        {preview.message} <span className="empty-state-caret" />
                    </span>
                </div>
            </div>

            <p className="empty-state-title">{title}</p>

            {description && <p className="empty-state-description">{description}</p>}

            {actions && <div className="empty-state-actions">{actions}</div>}
        </div>
    );
}

export { EmptyState };
export type { EmptyStatePreview, EmptyStateSize };
