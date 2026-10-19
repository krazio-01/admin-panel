import 'server-only';
import { connectDb } from '@/lib/db';
import { NotFoundError, SettingsConflictError } from '@/lib/errors';
import { EVENT_SETTINGS_KEY, SettingsModel, type SettingsDocument } from '@/models';
import type { UpdateSettingsInput } from '@/types/admin';

export type EventSettings = {
    eventName: string;
    eventDate: Date;
    gatesOpenAt: Date;
    venue: string;
    rows: number;
    seatsPerRow: number;
    maxGuestsPerBooking: number;
    bookingsOpen: boolean;
    nextSeatIndex: number;
    totalSeats: number;
};

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

export async function getEventSettings(): Promise<EventSettings> {
    await connectDb();

    const settings = await SettingsModel.findOne({ key: EVENT_SETTINGS_KEY }).lean();
    if (!settings) throw new NotFoundError('Event settings are not configured');

    return toEventSettings(settings);
}

export async function updateEventSettings(input: UpdateSettingsInput): Promise<EventSettings> {
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
