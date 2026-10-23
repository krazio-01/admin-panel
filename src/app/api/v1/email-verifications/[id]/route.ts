import { withDomainErrors } from '@/lib/errors';
import { clientIp, enforceRateLimit } from '@/providers/rate-limit';
import { confirmEmailVerification } from '@/services/server/emails';
import { confirmEmailVerificationSchema } from '@/types/booking';
import { parseBody } from '@/utils/http';

export const dynamic = 'force-dynamic';

export const PATCH = withDomainErrors(
    async (request: Request, context: { params: Promise<{ id: string }> }) => {
        await enforceRateLimit('emailVerificationConfirm', clientIp(request));

        const { id } = await context.params;
        const { code } = await parseBody(request, confirmEmailVerificationSchema);
        return Response.json(await confirmEmailVerification(id, code));
    },
);
