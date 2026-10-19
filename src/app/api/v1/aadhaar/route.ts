import { withDomainErrors } from '@/lib/errors';
import { clientIp } from '@/providers/rate-limit';
import { purgeAadhaar } from '@/services/server/aadhaar';
import { requireAdminMutation } from '@/services/server/auth';

export const dynamic = 'force-dynamic';

export const DELETE = withDomainErrors(async (request: Request) => {
    const admin = await requireAdminMutation(request);
    return Response.json(await purgeAadhaar(`admin:${admin.userId}`, clientIp(request)));
});
