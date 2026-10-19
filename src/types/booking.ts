import { z } from 'zod';

export const MAX_GUESTS_HARD_LIMIT = 10;

const stripSeparators = (value: string) => value.replace(/[\s-]/g, '');
const stripPhonePrefix = (value: string) => stripSeparators(value).replace(/^(\+91|0)/, '');

const trimmedText = z.string().trim();
const trimmedLowercase = trimmedText.toLowerCase();
const lowercaseText = z.string().toLowerCase();
const tokenText = z.string().max(2048);
const aadhaarDigits = z.string().transform(stripSeparators);
const phoneDigits = z.string().transform(stripPhonePrefix);

export const emailSchema = trimmedLowercase.pipe(z.email('Enter a valid email address').max(254));

export const guestInputSchema = z.object({
    name: trimmedText.min(2, 'Enter the guest name').max(100),
    aadhaar: aadhaarDigits.pipe(
        z.string().regex(/^[2-9]\d{11}$/, 'Enter a valid 12-digit Aadhaar number'),
    ),
    phone: phoneDigits.pipe(
        z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
    ),
    email: emailSchema,
});

const guestListSchema = z.array(guestInputSchema).min(1, 'Add at least one guest');

export const createBookingBodySchema = z
    .object({
        studentId: lowercaseText.regex(/^[a-f\d]{24}$/, 'Select a student'),
        guests: guestListSchema.max(MAX_GUESTS_HARD_LIMIT),
        botToken: tokenText.optional(),
        emailVerificationToken: tokenText.min(20, 'Verify the email address of Guest 1'),
    })
    .superRefine((booking, context) => {
        const seenAadhaar = new Set<string>();
        booking.guests.forEach((guest, index) => {
            if (seenAadhaar.has(guest.aadhaar)) {
                context.addIssue({
                    code: 'custom',
                    path: ['guests', index, 'aadhaar'],
                    message: 'This Aadhaar number is already used for another guest',
                });
            }

            seenAadhaar.add(guest.aadhaar);
        });
    });

export const idempotencyKeySchema = z.uuid();

export const startEmailVerificationSchema = z.object({
    email: emailSchema,
    botToken: tokenText.optional(),
});

export const confirmEmailVerificationSchema = z.object({
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export type CreateBookingBody = z.output<typeof createBookingBodySchema>;

export type CreateBookingInput = Omit<CreateBookingBody, 'botToken' | 'emailVerificationToken'> & {
    idempotencyKey: string;
};

export type CreateBookingFormValues = z.input<typeof createBookingBodySchema>;
