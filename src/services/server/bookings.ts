import 'server-only';
import mongoose, { type ClientSession } from 'mongoose';
import { z } from 'zod';
import { connectDb, pagingQueryFields, resolvePaging } from '@/lib/db';
import {
    BookingsClosedError,
    IdempotencyKeyConflictError,
    NotEnoughSeatsError,
    NotFoundError,
    StudentAlreadyBookedError,
    TooManyGuestsError,
} from '@/lib/errors';
import { writeAudit } from '@/lib/logger';
import { decryptField, encryptField } from '@/lib/security/encryption';
import { generateQrToken } from '@/lib/security/tokens';
import {
    type BookingDocument,
    BookingModel,
    EVENT_SETTINGS_KEY,
    SettingsModel,
    StudentModel,
} from '@/models';
import type { BookingListQuery, BookingPage, BookingRow } from '@/types/admin';
import {
    AADHAAR_GROUP_SIZE,
    AADHAAR_LENGTH,
    type BookingConfirmation,
    type CreateBookingInput,
} from '@/types/booking';
import { allocateSeatRange, seatLabels } from '@/utils/seats';
import { escapeRegex, groupCharacters, maskEmail, maskStart } from '@/utils/text';
import { toEmailDelivery } from './emails';

type BookingWithTimestamps = BookingDocument & { _id: unknown; createdAt: Date };
export type RevealedGuest = { name: string; aadhaar: string | null };

const DUPLICATE_KEY_ERROR_CODE = 11000;

export const bookingListQuerySchema: z.ZodType<BookingListQuery, unknown> = z.object({
    search: z.string().trim().max(100).optional(),
    status: z.enum(['confirmed', 'checkedIn']).optional(),
    emailStatus: z.enum(['pending', 'sent', 'failed']).optional(),
    ...pagingQueryFields,
});

function toConfirmation(
    booking: {
        _id: unknown;
        studentId: unknown;
        seats: string[];
        guests: { email: string }[];
    },
    requestedStudentId: string,
): BookingConfirmation {
    if (String(booking.studentId) !== requestedStudentId) throw new IdempotencyKeyConflictError();

    return {
        bookingId: String(booking._id),
        seats: booking.seats,
        primaryEmailMasked: maskEmail(booking.guests[0].email),
    };
}

async function bookInTransaction(
    input: CreateBookingInput,
    session: ClientSession,
): Promise<BookingConfirmation> {
    const replay = await BookingModel.findOne({ idempotencyKey: input.idempotencyKey }, null, {
        session,
        lean: true,
    });
    if (replay) return toConfirmation(replay, input.studentId);

    const settings = await SettingsModel.findOne({ key: EVENT_SETTINGS_KEY }, null, { session });
    if (!settings) throw new NotFoundError('Event settings are not configured');
    if (!settings.bookingsOpen) throw new BookingsClosedError();

    if (input.guests.length > settings.maxGuestsPerBooking) {
        throw new TooManyGuestsError(settings.maxGuestsPerBooking);
    }

    const allocation = allocateSeatRange(
        settings.nextSeatIndex,
        input.guests.length,
        settings.seatsPerRow,
        settings.rows * settings.seatsPerRow,
    );
    if (!allocation) throw new NotEnoughSeatsError();

    await SettingsModel.updateOne(
        { key: EVENT_SETTINGS_KEY },
        { $set: { nextSeatIndex: allocation.nextSeatIndex } },
        { session },
    );

    const student = await StudentModel.findOneAndUpdate(
        { _id: input.studentId, hasBooked: false },
        { $set: { hasBooked: true } },
        { session },
    );
    if (!student) throw new StudentAlreadyBookedError();

    const seats = seatLabels(allocation.startIndex, input.guests.length, settings.seatsPerRow);
    const [booking] = await BookingModel.create(
        [
            {
                studentId: student._id,
                studentName: student.name,
                studentGroup: student.group,
                idempotencyKey: input.idempotencyKey,
                qrToken: generateQrToken(),
                email: { status: 'pending', attempts: 0 },
                seats,
                seatStart: allocation.startIndex,
                seatCount: input.guests.length,
                guests: input.guests.map((guest) => ({
                    name: guest.name,
                    aadhaarEncrypted: encryptField(guest.aadhaar),
                    aadhaarLast4: guest.aadhaar.slice(-4),
                    phone: guest.phone,
                    email: guest.email,
                })),
            },
        ],
        { session },
    );

    return toConfirmation(booking, input.studentId);
}

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
            aadhaarMasked: guest.aadhaarLast4
                ? groupCharacters(maskStart(guest.aadhaarLast4, AADHAAR_LENGTH), AADHAAR_GROUP_SIZE)
                : null,
        })),
    };
}

export async function createBooking(input: CreateBookingInput): Promise<BookingConfirmation> {
    await connectDb();

    try {
        return await mongoose.connection.transaction((session) =>
            bookInTransaction(input, session),
        );
    } catch (error) {
        if (
            !(error instanceof mongoose.mongo.MongoServerError) ||
            error.code !== DUPLICATE_KEY_ERROR_CODE
        ) {
            throw error;
        }

        const existing = await BookingModel.findOne(
            { idempotencyKey: input.idempotencyKey },
            null,
            { lean: true },
        );
        if (existing) return toConfirmation(existing, input.studentId);

        throw new StudentAlreadyBookedError();
    }
}

export async function listBookings(query: BookingListQuery): Promise<BookingPage> {
    await connectDb();

    const { page, pageSize, skip } = resolvePaging(query);
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
            skip,
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

export async function purgeAadhaar(
    actor: string,
    ip?: string,
): Promise<{ bookingsUpdated: number }> {
    await connectDb();
    await writeAudit({ actor, action: 'admin.purge_aadhaar', ip });

    const result = await BookingModel.updateMany(
        {},
        { $set: { 'guests.$[].aadhaarEncrypted': null, 'guests.$[].aadhaarLast4': null } },
    );

    return { bookingsUpdated: result.modifiedCount };
}

export async function revealAadhaar(
    bookingId: string,
    actor: string,
    ip?: string,
): Promise<RevealedGuest[]> {
    if (!mongoose.isValidObjectId(bookingId)) throw new NotFoundError('Booking not found');

    await connectDb();

    const booking = await BookingModel.findById(bookingId, null, { lean: true });
    if (!booking) throw new NotFoundError('Booking not found');

    await writeAudit({ actor, action: 'admin.reveal_aadhaar', targetId: bookingId, ip });

    return booking.guests.map((guest) => ({
        name: guest.name,
        aadhaar: guest.aadhaarEncrypted ? decryptField(guest.aadhaarEncrypted) : null,
    }));
}
