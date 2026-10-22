import './radarFallback.scss';
import { classNames } from '@/utils/class-names';

type ScanOutcome = 'ok' | 'used' | 'bad';

const OUTCOME_COLORS: Record<ScanOutcome, string> = {
    ok: '#16a34a',
    used: '#d97706',
    bad: '#dc2626',
};

const CORNER_PATHS = [
    'M60 40 H40 V60',
    'M140 40 H160 V60',
    'M60 160 H40 V140',
    'M140 160 H160 V140',
];

export function RadarFallback({
    outcome = null,
    className,
}: {
    outcome?: ScanOutcome | null;
    className?: string;
}) {
    const color = outcome ? OUTCOME_COLORS[outcome] : '#ffffff';

    return (
        <div data-fallback="radar" className={classNames('radar-fallback', className)}>
            <svg
                className="radar-fallback-drawing"
                viewBox="0 0 200 200"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
            >
                <g stroke={color} fill="none">
                    <ellipse
                        cx="100"
                        cy="132"
                        rx="92"
                        ry="42"
                        strokeOpacity="0.8"
                        strokeWidth="1.5"
                    />
                    <ellipse cx="100" cy="132" rx="69" ry="31.5" strokeOpacity="0.25" />
                    <ellipse cx="100" cy="132" rx="46" ry="21" strokeOpacity="0.25" />
                    <ellipse cx="100" cy="132" rx="23" ry="10.5" strokeOpacity="0.25" />
                    <path d="M8 132 H192 M100 90 V174" strokeOpacity="0.12" />
                    <path
                        d="M100 132 L188 118 A92 42 0 0 0 164 102 Z"
                        fill={color}
                        fillOpacity="0.25"
                        stroke="none"
                    />
                    {CORNER_PATHS.map((path) => (
                        <path key={path} d={path} strokeWidth="4" strokeLinecap="square" />
                    ))}
                    <path d="M48 100 H152" strokeWidth="1.5" strokeOpacity="0.85" />
                </g>
            </svg>
        </div>
    );
}
