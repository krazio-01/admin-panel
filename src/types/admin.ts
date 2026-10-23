import { z } from 'zod/mini';
import type { EmailDelivery, EmailStatus } from '@/types/booking';

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_CSV_LENGTH = 1_000_000;

export const SESSION_ROLES = ['admin', 'checker'] as const;

const trimmedText = z.string().check(z.trim());
const trimmedLowercase = z.string().check(z.trim(), z.toLowerCase());

export const passwordSchema = z
    .string()
    .check(z.minLength(10, 'Use at least 10 characters'), z.maxLength(200));

export const checkerNameSchema = trimmedText.check(
    z.minLength(2, 'Enter the checker name'),
    z.maxLength(100),
);

export const loginSchema = z.object({
    username: trimmedLowercase.check(z.minLength(1, 'Enter your username'), z.maxLength(254)),
    password: z.string().check(z.minLength(1, 'Enter your password'), z.maxLength(200)),
});

export const createCheckerSchema = z.object({
    name: checkerNameSchema,
    username: trimmedLowercase.check(
        z.regex(/^[a-z0-9._-]{3,32}$/, 'Use 3-32 letters, digits, dots, dashes or underscores'),
    ),
    password: passwordSchema,
});

export const renameCheckerSchema = z.object({ name: checkerNameSchema });

export const resetCheckerPasswordSchema = z.object({ password: passwordSchema });

export const checkInSchema = z.object({
    token: z.string().check(z.minLength(1), z.maxLength(64)),
});

export const importStudentsSchema = z.object({
    csv: z.string().check(z.minLength(1), z.maxLength(MAX_IMPORT_CSV_LENGTH)),
});

export type SessionRole = (typeof SESSION_ROLES)[number];

export type LoginInput = z.output<typeof loginSchema>;

export type CreateCheckerInput = z.output<typeof createCheckerSchema>;

export type UpdateCheckerInput = { active?: boolean; password?: string; name?: string };

export type EventSettingsFields = {
    eventName: string;
    eventDate: Date;
    gatesOpenAt: Date;
    venue: string;
    rows: number;
    seatsPerRow: number;
    maxGuestsPerBooking: number;
    bookingsOpen: boolean;
};

export type UpdateSettingsBody = Omit<EventSettingsFields, 'eventDate' | 'gatesOpenAt'> & {
    eventDate: string;
    gatesOpenAt: string;
};

export type EventSettings = EventSettingsFields & { nextSeatIndex: number; totalSeats: number };

export type CheckerRow = {
    id: string;
    name: string;
    username: string;
    active: boolean;
    lastLoginAt: string | null;
    createdAt: string;
};

export type ImportResult = {
    inserted: number;
    skipped: number;
    errors: { line: number; reason: string }[];
};

export type BookingStatus = 'confirmed' | 'checkedIn';

export type BookingRow = {
    id: string;
    studentName: string;
    studentGroup: string;
    seats: string[];
    status: BookingStatus;
    email: EmailDelivery;
    checkedInAt: string | null;
    checkedInByName: string | null;
    createdAt: string;
    guests: { name: string; phone: string; email: string; aadhaarMasked: string | null }[];
};

export type BookingListQuery = {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: BookingStatus;
    emailStatus?: EmailStatus;
};

export type ListPage<Item> = {
    items: Item[];
    total: number;
    page: number;
    pageSize: number;
};

export type BookingPage = ListPage<BookingRow>;

export type StudentRow = {
    id: string;
    name: string;
    group: string;
    idNumber: string;
    hasBooked: boolean;
};

export type StudentListQuery = {
    page?: number;
    pageSize?: number;
    search?: string;
    booked?: boolean;
};

export type StudentPage = ListPage<StudentRow>;

export type DashboardStats = {
    totalSeats: number;
    seatsRemaining: number;
    bookings: number;
    guests: number;
    checkedInBookings: number;
    checkedInGuests: number;
    emailPending: number;
    emailFailed: number;
    studentsTotal: number;
    studentsBooked: number;
    checkers: number;
};

export type SeatState = 'booked' | 'checkedIn';

export type GateEvent = {
    id: string;
    kind: 'checkedIn' | 'alreadyCheckedIn';
    studentName: string;
    guestCount: number;
    checkerName: string;
    at: string;
};

export type DashboardSnapshot = {
    event: {
        eventName: string;
        eventDate: string;
        gatesOpenAt: string;
        venue: string;
        rows: number;
        seatsPerRow: number;
    };
    stats: DashboardStats;
    seats: Record<string, SeatState>;
    gateEvents: GateEvent[];
};
