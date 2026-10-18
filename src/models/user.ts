import { type InferSchemaType, type Model, model, models, Schema } from 'mongoose';

export type UserRole = 'admin' | 'checker';

const userSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        username: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ['admin', 'checker'], required: true },
        active: { type: Boolean, default: true },
        sessionVersion: { type: Number, default: 0 },
        lastLoginAt: Date,
    },
    { timestamps: true },
);

userSchema.index({ role: 1, createdAt: 1 });

export type UserDocument = InferSchemaType<typeof userSchema>;

const UserModel: Model<UserDocument> = models.User || model('User', userSchema);

export default UserModel;
