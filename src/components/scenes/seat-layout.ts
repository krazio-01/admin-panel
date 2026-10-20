import { rowLabel, seatLabel } from '@/utils/seats';

export type SeatPlacement = {
    label: string;
    x: number;
    y: number;
    z: number;
    row: number;
    delay: number;
};

export const ROW_SPACING = 1.05;
export const ROW_RISE = 0.22;
export const SEAT_SPACING = 0.82;
export const AISLE_WIDTH = 1.8;
export const FRONT_ROW_Z = -3.6;

const SIDE_MARGIN = 2.5;
const STAGE_DEPTH = 4.95;

function seatX(seat: number, seatsPerRow: number): number {
    const leftCount = Math.ceil(seatsPerRow / 2);
    const halfAisle = AISLE_WIDTH / 2;

    if (seat < leftCount) return -(halfAisle + (leftCount - 1 - seat) * SEAT_SPACING);

    return halfAisle + (seat - leftCount) * SEAT_SPACING;
}

export function computeSeatLayout(rows: number, seatsPerRow: number): SeatPlacement[] {
    const layout: SeatPlacement[] = [];

    for (let row = 0; row < rows; row += 1) {
        const label = rowLabel(row);
        const y = row * ROW_RISE;
        const z = FRONT_ROW_Z + row * ROW_SPACING;

        for (let seat = 0; seat < seatsPerRow; seat += 1) {
            const x = seatX(seat, seatsPerRow);

            layout.push({
                label: `${label}${seat + 1}`,
                x,
                y,
                z,
                row,
                delay: row * 0.07 + Math.abs(x) * 0.012,
            });
        }
    }

    return layout;
}

export function seatStatesFromNextIndex(
    nextSeatIndex: number,
    totalSeats: number,
    seatsPerRow: number,
): Record<string, 'booked'> {
    const states: Record<string, 'booked'> = {};
    const bookedCount = Math.min(Math.max(nextSeatIndex, 0), totalSeats);

    for (let index = 0; index < bookedCount; index += 1) {
        states[seatLabel(index, seatsPerRow)] = 'booked';
    }

    return states;
}

export function hallBounds(rows: number, seatsPerRow: number): { width: number; depth: number } {
    const widestSeat = Math.max(
        Math.abs(seatX(0, seatsPerRow)),
        Math.abs(seatX(seatsPerRow - 1, seatsPerRow)),
    );

    return {
        width: widestSeat * 2 + SIDE_MARGIN,
        depth: rows * ROW_SPACING + STAGE_DEPTH,
    };
}
