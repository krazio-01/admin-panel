import { withDomainErrors } from '@/lib/errors';
import { clientIp } from '@/providers/rate-limit';
import { writeAudit } from '@/services/server/audit';
import { requireAdminMutation } from '@/services/server/auth';
import { updateEventSettings } from '@/services/server/settings';
import { updateSettingsSchema } from '@/types/admin';
import { parseBody } from '@/utils/http';

export const dynamic = 'force-dynamic';

export const PUT = withDomainErrors(async (request: Request) => {
    const admin = await requireAdminMutation(request);
    const settings = await updateEventSettings(await parseBody(request, updateSettingsSchema));

    await writeAudit({
        actor: `admin:${admin.userId}`,
        action: 'admin.update_settings',
        ip: clientIp(request),
    });

    return Response.json(settings);
});
