import mongoose from 'mongoose';
import { getEnv } from '@/lib/env';

const CONNECTION_OPTIONS = {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    bufferCommands: false,
};

const globalForMongoose = globalThis as { mongooseConnection?: Promise<typeof mongoose> };

export async function connectDb(uri = getEnv().MONGODB_URI): Promise<typeof mongoose> {
    globalForMongoose.mongooseConnection ??= mongoose.connect(uri, CONNECTION_OPTIONS);

    try {
        return await globalForMongoose.mongooseConnection;
    } catch (error) {
        globalForMongoose.mongooseConnection = undefined;
        throw error;
    }
}

export async function disconnectDb(): Promise<void> {
    globalForMongoose.mongooseConnection = undefined;
    await mongoose.disconnect();
}
