import 'server-only';
import { Types } from 'mongoose';
import { connectDb } from '@/lib/db';
import {
    AuditLogModel,
    type BookingDocument,
    BookingModel,
    type EmailStatus,
    StudentModel,
    UserModel,
} from '@/models';
import { escapeRegex, maskAadhaar } from '@/utils/text';
import { type EmailDelivery, toEmailDelivery } from './emails';
import { getEventSettings } from './settings';

export type BookingRow = {
    id: string;
    studentName: string;
    studentGroup: string;
    seats: string[];
    status: 'confirmed' | 'checkedIn';
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
    status?: 'confirmed' | 'checkedIn';
    emailStatus?: EmailStatus;
};

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
};

export type BookingPage = {
    items: BookingRow[];
    total: number;
    page: number;
    pageSize: number;
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

type BookingSummaryDocument = { _id: unknown; studentName: string; seatCount: number };

type CheckerNameDocument = { _id: unknown; name: string };

const GATE_EVENT_LIMIT = 20;
const CHECKER_ACTOR_PREFIX = 'checker:';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 10000;

type BookingWithTimestamps = BookingDocument & { _id: unknown; createdAt: Date };

function toRow(booking: BookingWithTimestamps): BookingRow {
    return {
        id: String(booking._id),
        studentName: booking.studentName,
        studentGroup: booking.studentGroup,
        seats: booking.seats,
        status: booking.status,
        email: toEmailDelivery(booking.email),
        checkedInAt: booking.checkedInAt?.toISOString() ?? null,
        checkedInByName: booking.checkedInByName ?? null,
        createdAt: booking.createdAt.toISOString(),
        guests: booking.guests.map((guest) => ({
            name: guest.name,
            phone: guest.phone,
            email: guest.email,
            aadhaarMasked: guest.aadhaarLast4 ? maskAadhaar(guest.aadhaarLast4) : null,
        })),
    };
}

export async function listBookings(query: BookingListQuery): Promise<BookingPage> {
    await connectDb();

    const rawPage = query.page ?? 1;
    const requestedPage = Number.isFinite(rawPage) ? Math.floor(rawPage) : 1;
    const page = Math.min(MAX_PAGE, Math.max(1, requestedPage));
    const rawPageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const requestedPageSize = Number.isFinite(rawPageSize)
        ? Math.floor(rawPageSize)
        : DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedPageSize));
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.emailStatus) filter['email.status'] = query.emailStatus;

    const search = query.search?.trim();
    if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i');
        filter.$or = [
            { studentName: pattern },
            { 'guests.name': pattern },
            { 'guests.phone': pattern },
            { 'guests.email': pattern },
        ];
    }

    const [bookings, total] = await Promise.all([
        BookingModel.find(filter, null, {
            sort: { createdAt: -1, _id: -1 },
            skip: (page - 1) * pageSize,
            limit: pageSize,
            lean: true,
        }),
        BookingModel.countDocuments(filter),
    ]);

    return {
        items: (bookings as unknown as BookingWithTimestamps[]).map(toRow),
        total,
        page,
        pageSize,
    };
}

export async function getStats(): Promise<DashboardStats> {
    await connectDb();

    const [
        settings,
        bookings,
        checkedInBookings,
        emailPending,
        emailFailed,
        studentsTotal,
        studentsBooked,
        guestTotals,
    ] = await Promise.all([
        getEventSettings(),
        BookingModel.countDocuments(),
        BookingModel.countDocuments({ status: 'checkedIn' }),
        BookingModel.countDocuments({ 'email.status': 'pending' }),
        BookingModel.countDocuments({ 'email.status': 'failed' }),
        StudentModel.countDocuments(),
        StudentModel.countDocuments({ hasBooked: true }),
        BookingModel.aggregate<{ guests: number; checkedInGuests: number }>([
            {
                $group: {
                    _id: null,
                    guests: { $sum: '$seatCount' },
                    checkedInGuests: {
                        $sum: { $cond: [{ $eq: ['$status', 'checkedIn'] }, '$seatCount', 0] },
                    },
                },
            },
        ]),
    ]);

    return {
        totalSeats: settings.totalSeats,
        seatsRemaining: settings.totalSeats - settings.nextSeatIndex,
        bookings,
        guests: guestTotals[0]?.guests ?? 0,
        checkedInBookings,
        checkedInGuests: guestTotals[0]?.checkedInGuests ?? 0,
        emailPending,
        emailFailed,
        studentsTotal,
        studentsBooked,
    };
}

async function listGateEvents(): Promise<GateEvent[]> {
    const entries = await AuditLogModel.find(
        { action: { $in: ['checkin.success', 'checkin.duplicate'] } },
        null,
        { sort: { at: -1, _id: -1 }, limit: GATE_EVENT_LIMIT, lean: true },
    );

    const bookingIds = entries.flatMap((entry) =>
        entry.targetId && Types.ObjectId.isValid(entry.targetId) ? [entry.targetId] : [],
    );

    const checkerIdOf = (actor: string): string | undefined => {
        const candidate = actor.slice(CHECKER_ACTOR_PREFIX.length);

        return actor.startsWith(CHECKER_ACTOR_PREFIX) && Types.ObjectId.isValid(candidate)
            ? candidate
            : undefined;
    };

    const checkerIds = entries.flatMap((entry) => checkerIdOf(entry.actor) ?? []);

    const [bookings, checkers] = await Promise.all([
        BookingModel.find(
            { _id: { $in: bookingIds } },
            { studentName: 1, seatCount: 1 },
            { lean: true },
        ),
        UserModel.find({ _id: { $in: checkerIds } }, { name: 1 }, { lean: true }),
    ]);

    const bookingsById = new Map(
        (bookings as unknown as BookingSummaryDocument[]).map((booking) => [
            String(booking._id),
            booking,
        ]),
    );

    const checkerNamesById = new Map(
        (checkers as unknown as CheckerNameDocument[]).map((checker) => [
            String(checker._id),
            checker.name,
        ]),
    );

    return entries.map((entry) => {
        const booking = bookingsById.get(entry.targetId ?? '');
        const checkerId = checkerIdOf(entry.actor);

        return {
            id: String(entry._id),
            kind: entry.action === 'checkin.success' ? 'checkedIn' : 'alreadyCheckedIn',
            studentName: booking?.studentName ?? 'Unknown student',
            guestCount: booking?.seatCount ?? 0,
            checkerName: (checkerId && checkerNamesById.get(checkerId)) || 'Unknown checker',
            at: entry.at.toISOString(),
        };
    });
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
    await connectDb();

    const [settings, stats, bookings, gateEvents] = await Promise.all([
        getEventSettings(),
        getStats(),
        BookingModel.find({}, { seats: 1, status: 1 }, { lean: true }),
        listGateEvents(),
    ]);

    const seats: Record<string, SeatState> = {};

    for (const booking of bookings) {
        for (const seat of booking.seats) {
            seats[seat] = booking.status === 'checkedIn' ? 'checkedIn' : 'booked';
        }
    }

    return {
        event: {
            eventName: settings.eventName,
            eventDate: settings.eventDate.toISOString(),
            gatesOpenAt: settings.gatesOpenAt.toISOString(),
            venue: settings.venue,
            rows: settings.rows,
            seatsPerRow: settings.seatsPerRow,
        },
        stats,
        seats,
        gateEvents,
    };
}
