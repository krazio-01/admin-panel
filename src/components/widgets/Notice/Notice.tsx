import type { ComponentType, ReactNode } from 'react';
import './notice.scss';
import { Card } from '@/components/ui/Card/Card';

export function Notice({
    icon: Icon,
    title,
    description,
    footer,
    density = 'comfortable',
}: {
    icon: ComponentType;
    title: string;
    description: string;
    footer?: ReactNode;
    density?: 'comfortable' | 'compact';
}) {
    return (
        <Card raised className="notice" role="status" data-density={density}>
            <span className="notice-icon" aria-hidden="true">
                <Icon />
            </span>
            <h2 className="notice-title">{title}</h2>
            <p className="notice-description">{description}</p>
            {footer && <p className="notice-footer">{footer}</p>}
        </Card>
    );
}
