import { withDomainErrors } from '@/lib/errors';
import { clientIp, enforceRateLimit } from '@/providers/rate-limit';
import { revealAadhaar } from '@/services/server/aadhaar';
import { requireAdminSession } from '@/services/server/auth';
import { assertSameOriginFetch } from '@/utils/http';

export const dynamic = 'force-dynamic';

export const GET = withDomainErrors(
    async (request: Request, context: { params: Promise<{ id: string }> }) => {
        assertSameOriginFetch(request);

        const admin = await requireAdminSession();
        const actor = `admin:${admin.userId}`;
        await enforceRateLimit('aadhaarReveal', actor);

        const { id } = await context.params;
        const guests = await revealAadhaar(id, actor, clientIp(request));
        return Response.json({ guests }, { headers: { 'Cache-Control': 'no-store' } });
    },
);
