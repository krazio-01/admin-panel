import 'server-only';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { decryptField } from '@/lib/security/encryption';
import { BookingModel } from '@/models';
import { writeAudit } from './audit';

export type RevealedGuest = { name: string; aadhaar: string | null };

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
