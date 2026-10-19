import { BotCheckFailedError, withDomainErrors } from '@/lib/errors';
import { getBotCheck, getEmailSender } from '@/providers';
import { clientIp, enforceRateLimit } from '@/providers/rate-limit';
import { startEmailVerification } from '@/services/server/email-verification';
import { startEmailVerificationSchema } from '@/types/booking';
import { parseBody } from '@/utils/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const POST = withDomainErrors(async (request: Request) => {
    const ip = clientIp(request);
    await enforceRateLimit('emailVerificationSend', ip);

    const { email, botToken } = await parseBody(request, startEmailVerificationSchema);
    await enforceRateLimit('emailVerificationPerAddress', email);

    if (!(await getBotCheck().verify(botToken, ip))) throw new BotCheckFailedError();

    return Response.json(await startEmailVerification(email, getEmailSender()), { status: 201 });
});
