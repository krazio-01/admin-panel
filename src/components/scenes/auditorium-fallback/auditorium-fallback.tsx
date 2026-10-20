import './auditorium-fallback.scss';
import { classNames } from '@/utils/class-names';
import { seatLabel } from '@/utils/seats';

type SeatState = 'booked' | 'checkedIn';

const DEFAULT_ROWS = 8;
const DEFAULT_SEATS_PER_ROW = 16;
const MAX_DRAWN_ROWS = 12;
const MAX_DRAWN_SEATS = 24;
const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 260;
const FRONT_ROW_TOP = 96;
const BACK_ROW_BOTTOM = 248;
const FRONT_ROW_WIDTH = 250;
const BACK_ROW_WIDTH = 360;
const AISLE_RATIO = 0.06;

const SEAT_COLORS = {
    available: '#e4e4e7',
    booked: '#71717a',
    adminBooked: '#a1a1aa',
    checkedIn: '#09090b',
};

export function AuditoriumFallback({
    rows = DEFAULT_ROWS,
    seatsPerRow = DEFAULT_SEATS_PER_ROW,
    seats = {},
    highlight = [],
    variant = 'booking',
    className,
}: {
    rows?: number;
    seatsPerRow?: number;
    seats?: Record<string, SeatState>;
    highlight?: string[];
    variant?: 'booking' | 'admin';
    className?: string;
}) {
    const drawnRows = Math.min(rows, MAX_DRAWN_ROWS);
    const drawnSeats = Math.min(seatsPerRow, MAX_DRAWN_SEATS);
    const highlighted = new Set(highlight);
    const rowStep = (BACK_ROW_BOTTOM - FRONT_ROW_TOP) / drawnRows;
    const bookedColor = variant === 'admin' ? SEAT_COLORS.adminBooked : SEAT_COLORS.booked;
    const leftCount = Math.ceil(drawnSeats / 2);

    const seatRects = [];

    for (let drawnRow = 0; drawnRow < drawnRows; drawnRow += 1) {
        const progress = drawnRows === 1 ? 0 : drawnRow / (drawnRows - 1);
        const rowWidth = FRONT_ROW_WIDTH + (BACK_ROW_WIDTH - FRONT_ROW_WIDTH) * progress;
        const aisleWidth = rowWidth * AISLE_RATIO;
        const seatWidth = (rowWidth - aisleWidth) / drawnSeats;
        const rowLeft = (VIEW_WIDTH - rowWidth) / 2;
        const top = FRONT_ROW_TOP + drawnRow * rowStep;
        const actualRow = Math.floor((drawnRow * rows) / drawnRows);

        for (let drawnSeat = 0; drawnSeat < drawnSeats; drawnSeat += 1) {
            const actualSeat = Math.floor((drawnSeat * seatsPerRow) / drawnSeats);
            const label = seatLabel(actualRow * seatsPerRow + actualSeat, seatsPerRow);
            const state = seats[label];
            const aisleOffset = drawnSeat >= leftCount ? aisleWidth : 0;

            const fill =
                highlighted.has(label) || state === 'checkedIn'
                    ? SEAT_COLORS.checkedIn
                    : state === 'booked'
                      ? bookedColor
                      : SEAT_COLORS.available;

            seatRects.push(
                <rect
                    key={label}
                    x={rowLeft + aisleOffset + drawnSeat * seatWidth + seatWidth * 0.12}
                    y={top + rowStep * 0.14}
                    width={seatWidth * 0.76}
                    height={rowStep * 0.62}
                    rx={Math.min(seatWidth, rowStep) * 0.18}
                    fill={fill}
                />,
            );
        }
    }

    return (
        <div data-fallback="auditorium" className={classNames('auditorium-fallback', className)}>
            <svg
                className="auditorium-fallback__drawing"
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
            >
                <rect x="0" y="0" width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#ffffff" />
                <rect x="40" y="86" width="320" height="170" rx="6" fill="#f4f4f5" />
                <rect x="110" y="14" width="180" height="40" rx="3" fill="#27272a" />
                <rect x="114" y="18" width="172" height="32" rx="2" fill="#09090b" />
                <rect x="85" y="60" width="230" height="24" rx="3" fill="#27272a" />
                <text
                    x={VIEW_WIDTH / 2}
                    y="76"
                    textAnchor="middle"
                    className="auditorium-fallback__stage-label"
                >
                    STAGE
                </text>
                {seatRects}
            </svg>
        </div>
    );
}
