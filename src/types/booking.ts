import { z } from 'zod/mini';

export const MAX_GUESTS_HARD_LIMIT = 10;

export const VERIFICATION_CODE_LENGTH = 6;
export const AADHAAR_LENGTH = 12;
export const AADHAAR_GROUP_SIZE = 4;
export const PHONE_LENGTH = 10;
export const PHONE_GROUP_SIZES = [5, 5];

const stripSeparators = (value: string) => value.replace(/[\s-]/g, '');
const stripPhonePrefix = (value: string) => stripSeparators(value).replace(/^(\+91|0)/, '');

const trimmedText = z.string().check(z.trim());
const trimmedLowercase = z.string().check(z.trim(), z.toLowerCase());
const lowercaseText = z.string().check(z.toLowerCase());
const tokenText = z.string().check(z.maxLength(2048));
const aadhaarDigits = z.pipe(z.string(), z.transform(stripSeparators));
const phoneDigits = z.pipe(z.string(), z.transform(stripPhonePrefix));

export const emailSchema = z.pipe(
    trimmedLowercase,
    z.email('Enter a valid email address').check(z.maxLength(254)),
);

export const guestInputSchema = z.object({
    name: trimmedText.check(z.minLength(2, 'Enter the guest name'), z.maxLength(100)),
    aadhaar: z.pipe(
        aadhaarDigits,
        z.string().check(z.regex(/^[2-9]\d{11}$/, 'Enter a valid 12-digit Aadhaar number')),
    ),
    phone: z.pipe(
        phoneDigits,
        z.string().check(z.regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')),
    ),
    email: emailSchema,
});

const guestListSchema = z
    .array(guestInputSchema)
    .check(z.minLength(1, 'Add at least one guest'), z.maxLength(MAX_GUESTS_HARD_LIMIT));

export const createBookingBodySchema = z
    .object({
        studentId: lowercaseText.check(z.regex(/^[a-f\d]{24}$/, 'Select a student')),
        guests: guestListSchema,
        botToken: z.optional(tokenText),
        emailVerificationToken: tokenText.check(
            z.minLength(20, 'Verify the email address of Guest 1'),
        ),
    })
    .check(
        z.superRefine((booking, context) => {
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
        }),
    );

export const idempotencyKeySchema = z.uuid();

export const startEmailVerificationSchema = z.object({
    email: emailSchema,
    botToken: z.optional(tokenText),
});

export const confirmEmailVerificationSchema = z.object({
    code: z
        .string()
        .check(
            z.regex(
                new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`),
                `Enter the ${VERIFICATION_CODE_LENGTH}-digit code`,
            ),
        ),
});

export type CreateBookingBody = z.output<typeof createBookingBodySchema>;

export type CreateBookingInput = Omit<CreateBookingBody, 'botToken' | 'emailVerificationToken'> & {
    idempotencyKey: string;
};

export type CreateBookingFormValues = z.input<typeof createBookingBodySchema>;
