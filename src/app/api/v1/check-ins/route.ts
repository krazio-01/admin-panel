import { withDomainErrors } from '@/lib/errors';
import { clientIp, enforceRateLimit } from '@/providers/rate-limit';
import { requireCheckerMutation, requireCheckerSession } from '@/services/server/auth';
import { checkInByToken, getGateProgress } from '@/services/server/checkIns';
import { checkInSchema } from '@/types/admin';
import { parseBody } from '@/utils/http';

export const dynamic = 'force-dynamic';

const STATUS_BY_OUTCOME = { checked_in: 201, already_checked_in: 409, invalid: 404 } as const;

export const GET = withDomainErrors(async () => {
    await requireCheckerSession();

    return Response.json(await getGateProgress(), { headers: { 'Cache-Control': 'no-store' } });
});

export const POST = withDomainErrors(async (request: Request) => {
    const checker = await requireCheckerMutation(request);
    const ip = clientIp(request);
    await enforceRateLimit('scan', ip);

    const { token } = await parseBody(request, checkInSchema);
    const result = await checkInByToken(token, { id: checker.userId, name: checker.name }, ip);
    return Response.json(result, { status: STATUS_BY_OUTCOME[result.outcome] });
});
