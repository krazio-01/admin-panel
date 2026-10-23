import 'server-only';
import { connectDb } from '@/lib/db';
import { isWellFormedQrToken } from '@/lib/security/tokens';
import { type BookingDocument, BookingModel } from '@/models';
import {
    AADHAAR_GROUP_SIZE,
    AADHAAR_LENGTH,
    type CheckInBooking,
    type CheckInResult,
} from '@/types/booking';
import { groupCharacters, maskStart } from '@/utils/text';
import { writeAudit } from '@/lib/logger';

export type CheckerIdentity = { id: string; name: string };

function summarize(booking: BookingDocument): CheckInBooking {
    return {
        studentName: booking.studentName,
        studentGroup: booking.studentGroup,
        seats: booking.seats,
        guests: booking.guests.map((guest) => ({
            name: guest.name,
            aadhaarMasked: guest.aadhaarLast4
                ? groupCharacters(maskStart(guest.aadhaarLast4, AADHAAR_LENGTH), AADHAAR_GROUP_SIZE)
                : null,
        })),
    };
}

export async function checkInByToken(
    token: string,
    checker: CheckerIdentity,
    ip?: string,
): Promise<CheckInResult> {
    if (!isWellFormedQrToken(token)) return { outcome: 'invalid' };

    await connectDb();

    const actor = `checker:${checker.id}`;

    const checkedIn = await BookingModel.findOneAndUpdate(
        { qrToken: token, status: 'confirmed' },
        {
            $set: {
                status: 'checkedIn',
                checkedInAt: new Date(),
                checkedInBy: checker.id,
                checkedInByName: checker.name,
            },
        },
        { returnDocument: 'after', lean: true },
    );

    if (checkedIn) {
        await writeAudit({ actor, action: 'checkin.success', targetId: String(checkedIn._id), ip });
        return { outcome: 'checked_in', ...summarize(checkedIn) };
    }

    const existing = await BookingModel.findOne({ qrToken: token }, null, { lean: true });
    if (!existing) return { outcome: 'invalid' };

    await writeAudit({ actor, action: 'checkin.duplicate', targetId: String(existing._id), ip });

    return {
        outcome: 'already_checked_in',
        checkedInAt: existing.checkedInAt?.toISOString() ?? '',
        checkedInByName: existing.checkedInByName ?? null,
        ...summarize(existing),
    };
}
