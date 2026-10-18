import 'server-only';
import { connectDb } from '@/lib/db';
import { AuditLogModel } from '@/models';

export type AuditEntry = {
    actor: string;
    action: string;
    targetId?: string;
    ip?: string;
    details?: string;
};

export async function writeAudit(entry: AuditEntry): Promise<void> {
    await connectDb();
    await AuditLogModel.create(entry);
}
