import { withDomainErrors } from '@/lib/errors';
import { clientIp, enforceRateLimit } from '@/providers/rate-limit';
import { requireAdminMutation, requireAdminSession } from '@/services/server/auth';
import { createChecker, listCheckers } from '@/services/server/checkers';
import { createCheckerSchema } from '@/types/admin';
import { parseBody } from '@/utils/http';

export const dynamic = 'force-dynamic';

export const GET = withDomainErrors(async () => {
    await requireAdminSession();
    return Response.json(await listCheckers(), { headers: { 'Cache-Control': 'no-store' } });
});

export const POST = withDomainErrors(async (request: Request) => {
    const admin = await requireAdminMutation(request);
    await enforceRateLimit('checkerWrite', admin.userId);

    const input = await parseBody(request, createCheckerSchema);
    const checker = await createChecker(input, `admin:${admin.userId}`, clientIp(request));
    return Response.json(checker, { status: 201, headers: { 'Cache-Control': 'no-store' } });
});
