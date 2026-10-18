import 'server-only';
import mongoose from 'mongoose';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { getEnv } from '@/lib/env';
import { connectDb } from '@/lib/db';
import {
    EmailCapacityError,
    EmailDeliveryFailedError,
    EmailNotVerifiedError,
    InvalidVerificationCodeError,
    VerificationExpiredError,
    VerificationLockedError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { EMAIL_PROOF_SECONDS, signEmailProof, verifyEmailProof } from '@/lib/security/tokens';
import { EmailVerificationModel } from '@/models';
import type { EmailSender } from '@/providers/email';
import { renderVerificationEmail } from '@/templates/emails';
import { remainingEmailCapacity } from './emails';

export const OTP_VALID_SECONDS = 600;
export const MAX_CODE_ATTEMPTS = 5;
export const EMAILS_PER_BOOKING = 2;
const CODE_DIGITS = 6;

function hashCode(verificationId: string, code: string): string {
    const hmac = createHmac('sha256', getEnv().SESSION_SECRET);
    hmac.update(`${verificationId}:${code}`);
    return hmac.digest('hex');
}

export async function startEmailVerification(
    email: string,
    sender: EmailSender,
    options: { now?: Date; dailyLimit?: number } = {},
): Promise<{ verificationId: string; expiresInSeconds: number }> {
    await connectDb();
    const now = options.now ?? new Date();
    const dailyLimit = options.dailyLimit ?? getEnv().EMAIL_DAILY_LIMIT;
    if ((await remainingEmailCapacity(now, dailyLimit)) < EMAILS_PER_BOOKING)
        throw new EmailCapacityError();

    const verificationId = new mongoose.Types.ObjectId();
    const rawCode = randomInt(0, 10 ** CODE_DIGITS);
    const code = String(rawCode).padStart(CODE_DIGITS, '0');
    await EmailVerificationModel.create({
        _id: verificationId,
        email,
        codeHash: hashCode(String(verificationId), code),
        expiresAt: new Date(now.getTime() + OTP_VALID_SECONDS * 1000),
    });

    try {
        const { subject, html } = renderVerificationEmail({
            code,
            validMinutes: OTP_VALID_SECONDS / 60,
        });
        await sender.send({ to: email, subject, html });
    } catch (error) {
        logger.error(
            {
                verificationId: String(verificationId),
                errorName: error instanceof Error ? error.name : 'unknown',
            },
            'verification email failed',
        );
        await EmailVerificationModel.deleteOne({ _id: verificationId });
        throw new EmailDeliveryFailedError();
    }
    return { verificationId: String(verificationId), expiresInSeconds: OTP_VALID_SECONDS };
}

export async function confirmEmailVerification(
    verificationId: string,
    code: string,
    options: { now?: Date } = {},
): Promise<{ verificationToken: string; expiresInSeconds: number }> {
    if (!mongoose.isValidObjectId(verificationId)) throw new VerificationExpiredError();
    await connectDb();
    const now = options.now ?? new Date();

    const attempt = await EmailVerificationModel.findOneAndUpdate(
        {
            _id: verificationId,
            verifiedAt: null,
            expiresAt: { $gt: now },
            attempts: { $lt: MAX_CODE_ATTEMPTS },
        },
        { $inc: { attempts: 1 } },
        { returnDocument: 'after', lean: true },
    );
    if (!attempt) {
        const existing = await EmailVerificationModel.findById(verificationId, null, {
            lean: true,
        });
        if (existing?.verifiedAt) throw new VerificationExpiredError();
        if (existing && existing.expiresAt > now) throw new VerificationLockedError();
        throw new VerificationExpiredError();
    }

    const expected = Buffer.from(attempt.codeHash, 'hex');
    const actual = Buffer.from(hashCode(String(attempt._id), code), 'hex');
    if (!timingSafeEqual(expected, actual)) {
        throw new InvalidVerificationCodeError(MAX_CODE_ATTEMPTS - attempt.attempts);
    }

    const consumed = await EmailVerificationModel.updateOne(
        { _id: attempt._id, verifiedAt: null },
        { $set: { verifiedAt: now } },
    );
    if (consumed.modifiedCount !== 1) throw new VerificationExpiredError();
    return {
        verificationToken: await signEmailProof(attempt.email),
        expiresInSeconds: EMAIL_PROOF_SECONDS,
    };
}

export async function assertEmailProof(token: string | undefined, email: string): Promise<void> {
    const verifiedEmail = token ? await verifyEmailProof(token) : null;
    if (verifiedEmail !== email.toLowerCase()) throw new EmailNotVerifiedError();
}
