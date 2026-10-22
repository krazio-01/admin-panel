import type { ReactNode } from 'react';
import './statTiles.scss';
import { Stagger } from '@/components/ui/Animations/Animations';

export type StatTile = { label: string; value: ReactNode };

export function StatTiles({ tiles }: { tiles: StatTile[] }) {
    return (
        <Stagger className="stat-tiles">
            {tiles.map((tile) => (
                <div key={tile.label} className="stat-tiles-tile">
                    <span className="stat-tiles-label">{tile.label}</span>
                    <span className="stat-tiles-value">{tile.value}</span>
                </div>
            ))}
        </Stagger>
    );
}
