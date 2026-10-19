import 'server-only';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { NotFoundError, UsernameTakenError } from '@/lib/errors';
import { hashPassword } from '@/lib/security/password';
import { UserModel } from '@/models';
import type { CreateCheckerInput, UpdateCheckerInput } from '@/types/admin';
import { writeAudit } from './audit';

export type CheckerRow = {
    id: string;
    name: string;
    username: string;
    active: boolean;
    lastLoginAt: string | null;
    createdAt: string;
};

type CheckerRecord = {
    _id: unknown;
    name: string;
    username: string;
    active: boolean;
    lastLoginAt?: Date | null;
    createdAt: Date;
};

function toRow(user: CheckerRecord): CheckerRow {
    return {
        id: String(user._id),
        name: user.name,
        username: user.username,
        active: user.active,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
    };
}

export async function listCheckers(): Promise<CheckerRow[]> {
    await connectDb();

    const users = await UserModel.find({ role: 'checker' }, null, {
        sort: { createdAt: 1 },
        lean: true,
    });

    return (users as unknown as CheckerRecord[]).map(toRow);
}

export async function createChecker(
    input: CreateCheckerInput,
    actor: string,
    ip?: string,
): Promise<CheckerRow> {
    await connectDb();

    const passwordHash = await hashPassword(input.password);
    let user;

    try {
        user = await UserModel.create({
            name: input.name,
            username: input.username,
            passwordHash,
            role: 'checker',
        });
    } catch (error) {
        if ((error as { code?: number }).code === 11000) throw new UsernameTakenError();
        throw error;
    }

    await writeAudit({ actor, action: 'checker.create', targetId: String(user._id), ip });

    return toRow(user.toObject() as unknown as CheckerRecord);
}

export async function updateChecker(
    id: string,
    input: UpdateCheckerInput,
    actor: string,
    ip?: string,
): Promise<CheckerRow> {
    if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Checker not found');

    await connectDb();

    const changes: Record<string, unknown> = {};
    const actions: string[] = [];
    if (input.name !== undefined) {
        changes.name = input.name;
        actions.push('checker.rename');
    }

    if (input.active !== undefined) {
        changes.active = input.active;
        actions.push(input.active ? 'checker.enable' : 'checker.disable');
    }

    if (input.password !== undefined) {
        changes.passwordHash = await hashPassword(input.password);
        actions.push('checker.reset_password');
    }

    const revokesSessions = input.active === false || input.password !== undefined;
    const update = revokesSessions
        ? { $set: changes, $inc: { sessionVersion: 1 } }
        : { $set: changes };

    const user = await UserModel.findOneAndUpdate({ _id: id, role: 'checker' }, update, {
        returnDocument: 'after',
        lean: true,
    });
    if (!user) throw new NotFoundError('Checker not found');

    for (const action of actions) await writeAudit({ actor, action, targetId: id, ip });

    return toRow(user as unknown as CheckerRecord);
}
