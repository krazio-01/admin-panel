import type { ReactNode } from 'react';
import './pageHeading.scss';
import { Reveal } from '@/components/ui/Animations/Animations';

export function PageHeading({
    title,
    description,
    actions,
}: {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <Reveal className="page-heading">
            <div>
                <h1 className="page-heading-title">{title}</h1>
                {description && <p className="page-heading-description">{description}</p>}
            </div>

            {actions && <div className="page-heading-actions">{actions}</div>}
        </Reveal>
    );
}
