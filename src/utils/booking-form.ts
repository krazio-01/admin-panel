import { seatIndexFromLabel } from '@/utils/seats';

export type BookingStep = 'details' | 'verify' | 'pass';

export type BookingStepEvent = 'detailsValid' | 'codeConfirmed' | 'editDetails';

export const BOOKING_STEPS: { value: BookingStep; label: string }[] = [
    { value: 'details', label: 'Details' },
    { value: 'verify', label: 'Verify' },
    { value: 'pass', label: 'Pass' },
];

const TRANSITIONS: Record<BookingStep, Partial<Record<BookingStepEvent, BookingStep>>> = {
    details: { detailsValid: 'verify' },
    verify: { codeConfirmed: 'pass', editDetails: 'details' },
    pass: {},
};

export function nextStep(step: BookingStep, event: BookingStepEvent): BookingStep {
    return TRANSITIONS[step][event] ?? step;
}

export type GuestValues = { name: string; aadhaar: string; phone: string; email: string };

export type BookingDetailsValues = { studentId: string; guests: GuestValues[] };

export const EMPTY_GUEST: GuestValues = { name: '', aadhaar: '', phone: '', email: '' };

export function formatStudentGroupAndId(student: { group: string; idNumber: string }): string {
    return `Group ${student.group} · ${student.idNumber}`;
}

export type BookingState = { nextSeatIndex: number; seatsPerRow: number; ownSeats?: string[] };

export function bookedSeatCount({ nextSeatIndex, seatsPerRow, ownSeats }: BookingState): number {
    if (!ownSeats?.length) return nextSeatIndex;

    const lastAllocatedIndex = Math.max(
        ...ownSeats.map((seat) => seatIndexFromLabel(seat, seatsPerRow)),
    );

    return Math.max(nextSeatIndex + ownSeats.length, lastAllocatedIndex + 1);
}
