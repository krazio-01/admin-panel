import './emailStatus.scss';
import { Badge, type BadgeVariant } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import type { EmailDelivery } from '@/types/booking';
import type { EmailStatus as EmailStatusValue } from '@/types/booking';

export const EMAIL_STATUS_LABELS: Record<EmailStatusValue, string> = {
    sent: 'Sent',
    pending: 'Pending',
    failed: 'Failed',
};

const BADGE_VARIANTS: Record<EmailStatusValue, BadgeVariant> = {
    sent: 'success',
    pending: 'pending',
    failed: 'failed',
};

export function EmailStatus({
    delivery,
    onResend,
    isResending = false,
}: {
    delivery: EmailDelivery;
    onResend?: () => void;
    isResending?: boolean;
}) {
    return (
        <span className="email-status">
            <Badge
                variant={BADGE_VARIANTS[delivery.status]}
                title={delivery.lastError ?? undefined}
            >
                {EMAIL_STATUS_LABELS[delivery.status]}
            </Badge>

            {delivery.status === 'failed' && onResend && (
                <Button variant="link" size="xs" loading={isResending} onClick={onResend}>
                    Resend
                </Button>
            )}
        </span>
    );
}
