import type { ComponentType, ReactNode } from 'react';
import './notice.scss';
import { Card } from '@/components/ui/Card/Card';

export function Notice({
    icon: Icon,
    title,
    description,
    footer,
}: {
    icon: ComponentType;
    title: string;
    description: string;
    footer?: ReactNode;
}) {
    return (
        <Card raised className="notice" role="status">
            <span className="notice-icon" aria-hidden="true">
                <Icon />
            </span>
            <h2 className="notice-title">{title}</h2>
            <p className="notice-description">{description}</p>
            {footer && <p className="notice-footer">{footer}</p>}
        </Card>
    );
}
