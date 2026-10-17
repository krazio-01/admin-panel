import 'server-only';
import mongoose, { type ClientSession } from 'mongoose';
import { connectDb } from '@/lib/db';
import {
    BookingsClosedError,
    IdempotencyKeyConflictError,
    NotEnoughSeatsError,
    NotFoundError,
    StudentAlreadyBookedError,
    TooManyGuestsError,
} from '@/lib/errors';
import { encryptField } from '@/lib/security/encryption';
import { generateQrToken } from '@/lib/security/tokens';
import { BookingModel, EVENT_SETTINGS_KEY, SettingsModel, StudentModel } from '@/models';
import type { CreateBookingInput } from '@/types/booking';
import { allocateSeatRange, seatLabels } from '@/utils/seats';
import { maskEmail } from '@/utils/text';

export type BookingConfirmation = {
    bookingId: string;
    seats: string[];
    primaryEmailMasked: string;
};

const DUPLICATE_KEY_ERROR_CODE = 11000;

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
                studentClass: student.className,
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
