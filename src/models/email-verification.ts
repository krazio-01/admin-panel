import { type InferSchemaType, type Model, model, models, Schema } from 'mongoose';

const ONE_DAY_PLUS_HOUR_SECONDS = 25 * 60 * 60;

const emailVerificationSchema = new Schema(
    {
        email: { type: String, required: true, lowercase: true, trim: true },
        codeHash: { type: String, required: true },
        attempts: { type: Number, default: 0 },
        expiresAt: { type: Date, required: true },
        verifiedAt: Date,
    },
    { timestamps: true },
);

emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: ONE_DAY_PLUS_HOUR_SECONDS });
emailVerificationSchema.index({ createdAt: 1 });

export type EmailVerificationDocument = InferSchemaType<typeof emailVerificationSchema>;

const EmailVerificationModel: Model<EmailVerificationDocument> =
    models.EmailVerification || model('EmailVerification', emailVerificationSchema);

export default EmailVerificationModel;
