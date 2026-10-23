import 'server-only';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { NotFoundError, SettingsConflictError } from '@/lib/errors';
import { EVENT_SETTINGS_KEY, SettingsModel, type SettingsDocument } from '@/models';
import type { EventSettings, EventSettingsFields } from '@/types/admin';

const trimmedText = z.string().trim();

const wholeNumber = z.number().int();

const settingsFields = z.object({
    eventName: trimmedText.min(1).max(120),
    eventDate: z.coerce.date(),
    gatesOpenAt: z.coerce.date(),
    venue: trimmedText.min(1).max(160),
    rows: wholeNumber.min(1).max(100),
    seatsPerRow: wholeNumber.min(1).max(60),
    maxGuestsPerBooking: wholeNumber.min(1).max(10),
    bookingsOpen: z.boolean(),
});

export const updateSettingsSchema: z.ZodType<EventSettingsFields, unknown> = settingsFields.refine(
    (settings) => settings.gatesOpenAt <= settings.eventDate,
    { message: 'Gates must open on or before the event starts', path: ['gatesOpenAt'] },
);

function toEventSettings(settings: SettingsDocument): EventSettings {
    return {
        eventName: settings.eventName,
        eventDate: settings.eventDate,
        gatesOpenAt: settings.gatesOpenAt ?? settings.eventDate,
        venue: settings.venue,
        rows: settings.rows,
        seatsPerRow: settings.seatsPerRow,
        maxGuestsPerBooking: settings.maxGuestsPerBooking,
        bookingsOpen: settings.bookingsOpen,
        nextSeatIndex: settings.nextSeatIndex,
        totalSeats: settings.rows * settings.seatsPerRow,
    };
}

export async function findEventSettings(): Promise<EventSettings | null> {
    await connectDb();

    const settings = await SettingsModel.findOne({ key: EVENT_SETTINGS_KEY }).lean();

    return settings ? toEventSettings(settings) : null;
}

export async function getEventSettings(): Promise<EventSettings> {
    const settings = await findEventSettings();
    if (!settings) throw new NotFoundError('Event settings are not configured');

    return settings;
}

export async function updateEventSettings(input: EventSettingsFields): Promise<EventSettings> {
    await connectDb();

    if (input.maxGuestsPerBooking > input.seatsPerRow) {
        throw new SettingsConflictError(
            'The guest limit cannot be larger than the number of seats in a row.',
        );
    }

    const updated = await SettingsModel.findOneAndUpdate(
        {
            key: EVENT_SETTINGS_KEY,
            nextSeatIndex: { $lte: input.rows * input.seatsPerRow },
            $or: [{ nextSeatIndex: 0 }, { seatsPerRow: input.seatsPerRow }],
        },
        { $set: input },
        { returnDocument: 'after' },
    ).lean();
    if (updated) return toEventSettings(updated);

    await getEventSettings();

    throw new SettingsConflictError(
        'Seats per row cannot change once seats are allocated, and the theater cannot shrink below the seats already allocated.',
    );
}
