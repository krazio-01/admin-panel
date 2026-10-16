import { z } from 'zod';

const trimmedText = z.string().trim();
const trimmedLowercase = trimmedText.toLowerCase();
const wholeNumber = z.number().int();
const passwordSchema = z.string().min(10, 'Use at least 10 characters').max(200);
const personNameSchema = trimmedText.min(2, 'Enter the checker name').max(100);

export const loginSchema = z.object({
    username: trimmedLowercase.min(1, 'Enter your username').max(254),
    password: z.string().min(1, 'Enter your password').max(200),
});

export const createCheckerSchema = z.object({
    name: personNameSchema,
    username: trimmedLowercase.regex(
        /^[a-z0-9._-]{3,32}$/,
        'Use 3-32 letters, digits, dots, dashes or underscores',
    ),
    password: passwordSchema,
});

export const updateCheckerSchema = z
    .object({
        active: z.boolean().optional(),
        password: passwordSchema.optional(),
        name: personNameSchema.optional(),
    })
    .refine((update) => Object.keys(update).length > 0, 'Provide at least one field to update');

export const checkInSchema = z.object({ token: z.string().min(1).max(64) });

export const updateSettingsSchema = z.object({
    eventName: trimmedText.min(1).max(120),
    eventDate: z.coerce.date(),
    venue: trimmedText.min(1).max(160),
    rows: wholeNumber.min(1).max(100),
    seatsPerRow: wholeNumber.min(1).max(60),
    maxGuestsPerBooking: wholeNumber.min(1).max(10),
    bookingsOpen: z.boolean(),
});

export const importStudentsSchema = z.object({ csv: z.string().min(1).max(1_000_000) });

export type LoginInput = z.output<typeof loginSchema>;
export type CreateCheckerInput = z.output<typeof createCheckerSchema>;
export type UpdateCheckerInput = z.output<typeof updateCheckerSchema>;
export type UpdateSettingsInput = z.output<typeof updateSettingsSchema>;
