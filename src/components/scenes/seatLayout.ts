import { rowLabel, seatLabel } from '@/utils/seats';

type SeatPlacement = {
    label: string;
    x: number;
    y: number;
    z: number;
    row: number;
    delay: number;
};

export type Point3 = [number, number, number];

export type HighlightFocus = { indices: number[]; center: Point3; radius: number; yaw: number };

export type SeatState = 'booked' | 'checkedIn';

export type SeatStatus = 'available' | SeatState | 'own';

export const SEAT_STATUS_LABEL: Record<SeatStatus, string> = {
    available: 'Available',
    booked: 'Booked',
    checkedIn: 'Checked in',
    own: 'Your seat',
};

export type HallLayout = {
    width: number;
    seating: { frontZ: number; backZ: number; topHeight: number };
    floor: { width: number; depth: number; z: number };
    runnerWidth: number;
    stage: { width: number; depth: number; height: number; z: number; frontZ: number };
    backWall: { width: number; height: number; z: number };
    curtain: { width: number; height: number; x: number; z: number };
    valance: { height: number; y: number };
    screen: { width: number; height: number; y: number; z: number };
    extents: Point3[];
};

export const SEAT_COLORS = {
    available: '#d4d4d8',
    booked: '#3f3f46',
    adminBooked: '#71717a',
    checkedIn: '#09090b',
    glow: '#16a34a',
};

export const CHAIR_PROFILE = {
    width: 0.7,
    cushion: { y: 0.47, z: -0.06, height: 0.17, depth: 0.52, tilt: -0.06 },
    backrest: { y: 0.92, z: 0.25, tilt: 0.17, height: 0.8, depth: 0.13, bend: 0.28 },
    shell: { offsetY: -0.18, offsetZ: 0.085, height: 0.5, depth: 0.05, extraWidth: 0.05 },
    arm: { y: 0.65, z: -0.02, width: 0.085, height: 0.06, depth: 0.56 },
};

export const ROW_SPACING = 1.05;
export const ROW_RISE = 0.22;
export const SEAT_SPACING = 0.82;
const AISLE_WIDTH = 1.8;
export const FRONT_ROW_Z = -3.6;
const CHAIR_HEIGHT = 1.02;

const SIDE_MARGIN = 2.5;
const STAGE_DEPTH = 4.95;
const STAGE_HEIGHT = 0.8;
const STAGE_FRONT_GAP = 1.8;
const STAGE_FLOOR_DEPTH = 3.2;
const SCREEN_ASPECT = 0.26;
const SCREEN_LIFT = 0.75;
const BACK_FLOOR_MARGIN = 0.6;

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

export function bookedSeatStates(
    bookedSeatCount: number,
    totalSeats: number,
    seatsPerRow: number,
): Record<string, SeatState> {
    const states: Record<string, SeatState> = {};
    const drawnBookedCount = Math.min(Math.max(bookedSeatCount, 0), totalSeats);

    for (let index = 0; index < drawnBookedCount; index += 1) {
        states[seatLabel(index, seatsPerRow)] = 'booked';
    }

    return states;
}

export function seatStatus(
    label: string,
    seatStates: Record<string, SeatState>,
    ownSeatLabels: ReadonlySet<string>,
): SeatStatus {
    if (ownSeatLabels.has(label)) return 'own';

    return seatStates[label] ?? 'available';
}

export function computeHighlightFocus(
    highlightedSeatLabels: string[],
    layout: SeatPlacement[],
    hallWidth: number,
    highlightYaw: number,
): HighlightFocus | null {
    const labels = new Set(highlightedSeatLabels);
    const indices = layout.flatMap((placement, index) =>
        labels.has(placement.label) ? [index] : [],
    );
    const placements = indices.map((index) => layout[index]);

    if (placements.length === 0) return null;

    const xs = placements.map((placement) => placement.x);
    const zs = placements.map((placement) => placement.z);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2;
    const halfSpan = Math.max(
        (Math.max(...xs) - Math.min(...xs)) / 2,
        (Math.max(...zs) - Math.min(...zs)) / 2,
    );
    const topY = Math.max(...placements.map((placement) => placement.y));

    return {
        indices,
        center: [centerX, topY + 0.03, centerZ],
        radius: Math.max(1.2, halfSpan + 0.6),
        yaw: (centerX / (hallWidth / 2)) * highlightYaw,
    };
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

export function computeRowEnds(rows: number, seatsPerRow: number): Point3[] {
    const leftCount = Math.ceil(seatsPerRow / 2);
    const rightCount = seatsPerRow - leftCount;
    const halfSlot = SEAT_SPACING / 2;
    const blocks = [
        {
            count: leftCount,
            inner: seatX(leftCount - 1, seatsPerRow),
            outer: seatX(0, seatsPerRow),
        },
        {
            count: rightCount,
            inner: seatX(leftCount, seatsPerRow),
            outer: seatX(seatsPerRow - 1, seatsPerRow),
        },
    ];
    const ends: Point3[] = [];

    for (let row = 0; row < rows; row += 1) {
        const y = row * ROW_RISE;
        const z = FRONT_ROW_Z + row * ROW_SPACING;

        for (const block of blocks) {
            if (block.count === 0) continue;

            const side = Math.sign(block.inner);

            ends.push([block.inner - side * halfSlot, y, z], [block.outer + side * halfSlot, y, z]);
        }
    }

    return ends;
}

export function computeHallLayout(rows: number, seatsPerRow: number): HallLayout {
    const { width } = hallBounds(rows, seatsPerRow);

    const seatingFrontZ = FRONT_ROW_Z - ROW_SPACING / 2;
    const seatingBackZ = FRONT_ROW_Z + (rows - 0.5) * ROW_SPACING;
    const topHeight = (rows - 1) * ROW_RISE;

    const stageWidth = width * 0.8;
    const stageFrontZ = FRONT_ROW_Z - STAGE_FRONT_GAP;
    const stageBackZ = stageFrontZ - STAGE_FLOOR_DEPTH;

    const screenWidth = stageWidth * 0.62;
    const screenHeight = screenWidth * SCREEN_ASPECT;
    const screenBottom = STAGE_HEIGHT + SCREEN_LIFT;
    const valanceHeight = Math.max(0.35, screenHeight * 0.18);
    const wallHeight = screenBottom + screenHeight + 0.45 + valanceHeight;
    const curtainWidth = stageWidth * 0.11;

    const floorBackZ = seatingBackZ + BACK_FLOOR_MARGIN;
    const floorWidth = width + 0.4;
    const halfFloor = floorWidth / 2;
    const halfStage = stageWidth / 2;
    const seatingTop = topHeight + CHAIR_HEIGHT;

    return {
        width,
        seating: { frontZ: seatingFrontZ, backZ: seatingBackZ, topHeight },
        floor: {
            width: floorWidth,
            depth: floorBackZ - stageBackZ,
            z: (floorBackZ + stageBackZ) / 2,
        },
        runnerWidth: AISLE_WIDTH * 0.55,
        stage: {
            width: stageWidth,
            depth: STAGE_FLOOR_DEPTH,
            height: STAGE_HEIGHT,
            z: stageFrontZ - STAGE_FLOOR_DEPTH / 2,
            frontZ: stageFrontZ,
        },
        backWall: { width: stageWidth, height: wallHeight, z: stageBackZ },
        curtain: {
            width: curtainWidth,
            height: wallHeight - valanceHeight + 0.05,
            x: halfStage - curtainWidth / 2,
            z: stageBackZ + 0.45,
        },
        valance: { height: valanceHeight, y: wallHeight - valanceHeight / 2 },
        screen: {
            width: screenWidth,
            height: screenHeight,
            y: screenBottom + screenHeight / 2,
            z: stageBackZ + 0.12,
        },
        extents: [
            [-halfFloor, -0.2, floorBackZ],
            [halfFloor, -0.2, floorBackZ],
            [-halfFloor, seatingTop, floorBackZ],
            [halfFloor, seatingTop, floorBackZ],
            [-halfFloor, -0.2, stageBackZ],
            [halfFloor, -0.2, stageBackZ],
            [-halfStage, wallHeight, stageBackZ],
            [halfStage, wallHeight, stageBackZ],
        ],
    };
}
