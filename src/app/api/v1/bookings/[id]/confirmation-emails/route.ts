import { withDomainErrors } from '@/lib/errors';
import { getEmailSender } from '@/providers';
import { clientIp } from '@/providers/rate-limit';
import { writeAudit } from '@/services/server/audit';
import { requireAdminMutation } from '@/services/server/auth';
import { resendConfirmationEmail } from '@/services/server/emails';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = withDomainErrors(
    async (request: Request, context: { params: Promise<{ id: string }> }) => {
        const admin = await requireAdminMutation(request);
        const { id } = await context.params;
        const delivery = await resendConfirmationEmail(id, getEmailSender());

        await writeAudit({
            actor: `admin:${admin.userId}`,
            action: 'admin.resend_email',
            targetId: id,
            ip: clientIp(request),
        });

        return Response.json(delivery, { status: 201 });
    },
);
