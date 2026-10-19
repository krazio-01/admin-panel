import { withDomainErrors } from '@/lib/errors';
import { requireAdminSession } from '@/services/server/auth';
import { getDashboardSnapshot } from '@/services/server/dashboard';

export const dynamic = 'force-dynamic';

export const GET = withDomainErrors(async () => {
    await requireAdminSession();

    return Response.json(await getDashboardSnapshot(), {
        headers: { 'Cache-Control': 'no-store' },
    });
});
