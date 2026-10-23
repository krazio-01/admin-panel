import { withDomainErrors } from '@/lib/errors';
import { clientIp, enforceRateLimit } from '@/providers/rate-limit';
import { requireAdminMutation } from '@/services/server/auth';
import { updateChecker, updateCheckerSchema } from '@/services/server/checkers';
import { parseBody } from '@/utils/http';

export const dynamic = 'force-dynamic';

export const PATCH = withDomainErrors(
    async (request: Request, context: { params: Promise<{ id: string }> }) => {
        const admin = await requireAdminMutation(request);
        await enforceRateLimit('checkerWrite', admin.userId);

        const { id } = await context.params;
        const input = await parseBody(request, updateCheckerSchema);
        const checker = await updateChecker(id, input, `admin:${admin.userId}`, clientIp(request));
        return Response.json(checker, { headers: { 'Cache-Control': 'no-store' } });
    },
);
