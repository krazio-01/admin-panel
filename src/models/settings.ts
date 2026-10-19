import { type InferSchemaType, type Model, model, models, Schema } from 'mongoose';

export const EVENT_SETTINGS_KEY = 'event';

const settingsSchema = new Schema(
    {
        key: { type: String, required: true, unique: true, default: EVENT_SETTINGS_KEY },
        eventName: { type: String, required: true },
        eventDate: { type: Date, required: true },
        gatesOpenAt: { type: Date, required: true },
        venue: { type: String, required: true },
        rows: { type: Number, required: true, min: 1 },
        seatsPerRow: { type: Number, required: true, min: 1 },
        maxGuestsPerBooking: { type: Number, default: 4, min: 1 },
        nextSeatIndex: { type: Number, default: 0, min: 0 },
        bookingsOpen: { type: Boolean, default: true },
    },
    { timestamps: true },
);

export type SettingsDocument = InferSchemaType<typeof settingsSchema>;

const SettingsModel: Model<SettingsDocument> = models.Settings || model('Settings', settingsSchema);

export default SettingsModel;
