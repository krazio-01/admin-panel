import { after } from 'next/server';
import { BotCheckFailedError, withDomainErrors } from '@/lib/errors';
import { getBotCheck, getEmailSender } from '@/providers';
import { clientIp, enforceRateLimit } from '@/providers/rate-limit';
import { createBooking } from '@/services/server/bookings';
import { assertEmailProof } from '@/services/server/email-verification';
import { sendConfirmationEmail } from '@/services/server/emails';
import { createBookingBodySchema } from '@/types/booking';
import { parseBody, parseIdempotencyKey } from '@/utils/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = withDomainErrors(async (request: Request) => {
    const ip = clientIp(request);
    await enforceRateLimit('booking', ip);

    const idempotencyKey = parseIdempotencyKey(request.headers);

    const { botToken, emailVerificationToken, ...booking } = await parseBody(
        request,
        createBookingBodySchema,
    );
    if (!(await getBotCheck().verify(botToken, ip))) throw new BotCheckFailedError();

    await assertEmailProof(emailVerificationToken, booking.guests[0].email);

    const confirmation = await createBooking({ ...booking, idempotencyKey });
    after(() => sendConfirmationEmail(confirmation.bookingId, getEmailSender()));

    return Response.json(confirmation, { status: 201 });
});
