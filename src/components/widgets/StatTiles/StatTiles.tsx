import { useId, type ReactNode } from 'react';
import './statTiles.scss';
import { Stagger } from '@/components/ui/Animations/Animations';
import { classNames } from '@/utils/class-names';

export type StatTile = { label: string; value: ReactNode; aside?: ReactNode; footer?: ReactNode };

export function StatTiles({
    tiles,
    variant = 'compact',
    className,
}: {
    tiles: StatTile[];
    variant?: 'compact' | 'card' | 'counter';
    className?: string;
}) {
    const labelIdPrefix = useId();

    return (
        <Stagger className={classNames('stat-tiles', className)} data-variant={variant}>
            {tiles.map((tile, index) => (
                <div
                    key={tile.label}
                    className="stat-tiles-tile"
                    role="group"
                    aria-labelledby={`${labelIdPrefix}-${index}`}
                >
                    <div className="stat-tiles-head">
                        <span id={`${labelIdPrefix}-${index}`} className="stat-tiles-label">
                            {tile.label}
                        </span>
                        {tile.aside}
                    </div>
                    <span className="stat-tiles-value">{tile.value}</span>
                    {tile.footer && <div className="stat-tiles-footer">{tile.footer}</div>}
                </div>
            ))}
        </Stagger>
    );
}
