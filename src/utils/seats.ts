const ALPHABET_LENGTH = 26;

export function rowLabel(rowIndex: number): string {
    let label = '';
    let remaining = rowIndex;
    do {
        label = String.fromCharCode('A'.charCodeAt(0) + (remaining % ALPHABET_LENGTH)) + label;
        remaining = Math.floor(remaining / ALPHABET_LENGTH) - 1;
    } while (remaining >= 0);

    return label;
}

export function seatLabel(seatIndex: number, seatsPerRow: number): string {
    return `${rowLabel(Math.floor(seatIndex / seatsPerRow))}${(seatIndex % seatsPerRow) + 1}`;
}

export function seatIndexFromLabel(label: string, seatsPerRow: number): number {
    const match = /^([A-Z]+)(\d+)$/.exec(label);
    if (!match) throw new Error(`Invalid seat label: ${label}`);

    const [, rowLetters, seatNumber] = match;
    const rowPosition = Array.from(rowLetters).reduce(
        (position, letter) =>
            position * ALPHABET_LENGTH + letter.charCodeAt(0) - 'A'.charCodeAt(0) + 1,
        0,
    );

    return (rowPosition - 1) * seatsPerRow + Number(seatNumber) - 1;
}

export function seatLabels(startIndex: number, count: number, seatsPerRow: number): string[] {
    return Array.from({ length: count }, (_, offset) =>
        seatLabel(startIndex + offset, seatsPerRow),
    );
}

export function allocateSeatRange(
    nextSeatIndex: number,
    partySize: number,
    seatsPerRow: number,
    totalSeats: number,
): { startIndex: number; nextSeatIndex: number } | null {
    const seatsLeftInRow = seatsPerRow - (nextSeatIndex % seatsPerRow);
    const startIndex = partySize > seatsLeftInRow ? nextSeatIndex + seatsLeftInRow : nextSeatIndex;
    const endIndex = startIndex + partySize;
    return endIndex > totalSeats ? null : { startIndex, nextSeatIndex: endIndex };
}
