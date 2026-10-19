import 'server-only';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { getEnv } from '@/lib/env';
import { connectDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { BookingModel, type EmailStatus, EmailVerificationModel } from '@/models';
import type { EmailSender } from '@/providers/email';
import { renderConfirmationEmail } from '@/templates/emails';
import { getEventSettings } from './settings';

export function renderQrPng(token: string): Promise<Buffer> {
    return QRCode.toBuffer(token, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 360,
    });
}

const DAY_MS = 24 * 60 * 60_000;

export async function countEmailsSentInLastDay(now: Date): Promise<number> {
    await connectDb();

    const since = new Date(now.getTime() - DAY_MS);
    const [confirmations, verificationCodes] = await Promise.all([
        BookingModel.countDocuments({ 'email.sentAt': { $gte: since } }),
        EmailVerificationModel.countDocuments({ createdAt: { $gte: since } }),
    ]);

    return confirmations + verificationCodes;
}

export async function remainingEmailCapacity(now: Date, dailyLimit: number): Promise<number> {
    return dailyLimit - (await countEmailsSentInLastDay(now));
}

export const DAILY_LIMIT_MESSAGE = 'Daily email limit reached';
const GENERIC_FAILURE_MESSAGE = 'Email could not be sent';
const QR_CONTENT_ID = 'invitation-qr';

export type EmailDelivery = {
    status: EmailStatus;
    sentAt: string | null;
    attempts: number;
    lastError: string | null;
};

export type SendOptions = { now?: Date; dailyLimit?: number };

type StoredEmail = {
    status: EmailStatus;
    sentAt?: Date | null;
    attempts: number;
    lastError?: string | null;
};

export function toEmailDelivery(email: StoredEmail): EmailDelivery {
    return {
        status: email.status,
        sentAt: email.sentAt?.toISOString() ?? null,
        attempts: email.attempts,
        lastError: email.lastError ?? null,
    };
}

export function describeSendFailure(error: unknown): string {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
    return typeof code === 'string' && /^[A-Z][A-Z0-9_]{1,30}$/.test(code)
        ? `SMTP error ${code}`
        : GENERIC_FAILURE_MESSAGE;
}

async function attemptDelivery(
    booking: {
        _id: unknown;
        studentName: string;
        seats: string[];
        qrToken: string;
        guests: { name: string; email: string }[];
    },
    sender: EmailSender,
    options: SendOptions,
): Promise<EmailDelivery> {
    const now = options.now ?? new Date();
    const bookingId = String(booking._id);

    let update: Record<string, unknown>;

    try {
        const dailyLimit = options.dailyLimit ?? getEnv().EMAIL_DAILY_LIMIT;
        if ((await countEmailsSentInLastDay(now)) >= dailyLimit) {
            update = {
                $set: { 'email.status': 'failed', 'email.lastError': DAILY_LIMIT_MESSAGE },
            };
        } else {
            const settings = await getEventSettings();
            const { subject, html } = renderConfirmationEmail({
                eventName: settings.eventName,
                eventDate: settings.eventDate,
                gatesOpenAt: settings.gatesOpenAt,
                venue: settings.venue,
                studentName: booking.studentName,
                guestNames: booking.guests.map((guest) => guest.name),
                seats: booking.seats,
                qrContentId: QR_CONTENT_ID,
            });

            await sender.send({
                to: booking.guests[0].email,
                subject,
                html,
                attachments: [
                    {
                        filename: 'invitation-qr.png',
                        content: await renderQrPng(booking.qrToken),
                        contentType: 'image/png',
                        cid: QR_CONTENT_ID,
                    },
                ],
            });

            update = {
                $set: { 'email.status': 'sent', 'email.sentAt': now },
                $unset: { 'email.lastError': '' },
            };
        }
    } catch (error) {
        logger.error(
            { bookingId, errorName: error instanceof Error ? error.name : 'unknown' },
            'confirmation email failed',
        );

        update = {
            $set: { 'email.status': 'failed', 'email.lastError': describeSendFailure(error) },
        };
    }

    const recorded = await BookingModel.findOneAndUpdate({ _id: bookingId }, update, {
        returnDocument: 'after',
        lean: true,
    });
    if (!recorded) throw new NotFoundError('Booking not found');

    return toEmailDelivery(recorded.email);
}

export async function sendConfirmationEmail(
    bookingId: string,
    sender: EmailSender,
    options: SendOptions = {},
): Promise<void> {
    try {
        await connectDb();

        const claimed = await BookingModel.findOneAndUpdate(
            { _id: bookingId, 'email.status': 'pending', 'email.attempts': 0 },
            { $inc: { 'email.attempts': 1 } },
            { returnDocument: 'after', lean: true },
        );
        if (claimed) await attemptDelivery(claimed, sender, options);
    } catch (error) {
        logger.error(
            { bookingId, errorName: error instanceof Error ? error.name : 'unknown' },
            'confirmation email could not be processed',
        );
    }
}

export async function resendConfirmationEmail(
    bookingId: string,
    sender: EmailSender,
    options: SendOptions = {},
): Promise<EmailDelivery> {
    if (!mongoose.isValidObjectId(bookingId)) throw new NotFoundError('Booking not found');

    await connectDb();

    const claimed = await BookingModel.findOneAndUpdate(
        { _id: bookingId },
        { $inc: { 'email.attempts': 1 } },
        { returnDocument: 'after', lean: true },
    );
    if (!claimed) throw new NotFoundError('Booking not found');

    return attemptDelivery(claimed, sender, options);
}
