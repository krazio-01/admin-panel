import 'server-only';
import { connectDb } from '@/lib/db';
import { type BookingDocument, BookingModel, type EmailStatus, StudentModel } from '@/models';
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

export async function listBookings(query: BookingListQuery) {
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
