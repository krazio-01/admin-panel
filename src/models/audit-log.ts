import { type InferSchemaType, type Model, model, models, Schema } from 'mongoose';

const auditLogSchema = new Schema({
    actor: { type: String, required: true },
    action: { type: String, required: true },
    targetId: String,
    ip: String,
    details: String,
    at: { type: Date, default: Date.now, index: true },
});

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema>;

const AuditLogModel: Model<AuditLogDocument> = models.AuditLog || model('AuditLog', auditLogSchema);

export default AuditLogModel;
