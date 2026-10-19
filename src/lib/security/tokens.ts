import 'server-only';
import { jwtVerify, SignJWT } from 'jose';
import { randomBytes } from 'node:crypto';
import { getEnv } from '@/lib/env';

export type SessionRole = 'admin' | 'checker';

export type SessionPayload = { role: SessionRole; userId: string; sessionVersion: number };

export type SessionCookieOptions = {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    path: string;
    maxAge: number;
};

export const ADMIN_COOKIE = 'admin_session';
export const CHECKER_COOKIE = 'checker_session';
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export const CHECKER_SESSION_SECONDS = 12 * 60 * 60;
export const SESSION_COOKIE_BY_ROLE = { admin: ADMIN_COOKIE, checker: CHECKER_COOKIE } as const;

const ISSUER = 'event-booking';
const ALGORITHM = 'HS256';
const MIN_SECRET_BYTES = 32;

function getSigningKey(): Uint8Array {
    const key = new TextEncoder().encode(getEnv().SESSION_SECRET);
    if (key.byteLength < MIN_SECRET_BYTES) {
        throw new Error(`SESSION_SECRET must be at least ${MIN_SECRET_BYTES} bytes`);
    }

    return key;
}

export async function signSession(payload: SessionPayload, ttlSeconds: number): Promise<string> {
    const issuedAt = Math.floor(Date.now() / 1000);
    const token = new SignJWT({
        ...payload,
        iss: ISSUER,
        aud: payload.role,
        iat: issuedAt,
        exp: issuedAt + ttlSeconds,
    });
    token.setProtectedHeader({ alg: ALGORITHM });

    return token.sign(getSigningKey());
}

export async function verifySession(
    token: string | undefined,
    expectedRole: SessionRole,
): Promise<SessionPayload | null> {
    if (!token) return null;

    const key = getSigningKey();

    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: [ALGORITHM],
            audience: expectedRole,
            issuer: ISSUER,
        });

        if (typeof payload.userId !== 'string' || !payload.userId) return null;
        if (!Number.isInteger(payload.sessionVersion)) return null;

        return {
            role: expectedRole,
            userId: payload.userId,
            sessionVersion: payload.sessionVersion as number,
        };
    } catch {
        return null;
    }
}

export function sessionCookieOptions(maxAgeSeconds: number): SessionCookieOptions {
    return {
        httpOnly: true,
        secure: getEnv().NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeSeconds,
    };
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function generateQrToken(): string {
    return randomBytes(16).toString('base64url');
}

export function isWellFormedQrToken(value: string): boolean {
    return TOKEN_PATTERN.test(value);
}

const EMAIL_PROOF_AUDIENCE = 'email-proof';
export const EMAIL_PROOF_SECONDS = 60 * 60;

export async function signEmailProof(email: string): Promise<string> {
    const issuedAt = Math.floor(Date.now() / 1000);
    const token = new SignJWT({
        email: email.toLowerCase(),
        iss: ISSUER,
        aud: EMAIL_PROOF_AUDIENCE,
        iat: issuedAt,
        exp: issuedAt + EMAIL_PROOF_SECONDS,
    });
    token.setProtectedHeader({ alg: ALGORITHM });

    return token.sign(getSigningKey());
}

export async function verifyEmailProof(token: string): Promise<string | null> {
    const key = getSigningKey();

    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: [ALGORITHM],
            audience: EMAIL_PROOF_AUDIENCE,
            issuer: ISSUER,
        });

        return typeof payload.email === 'string' ? payload.email : null;
    } catch {
        return null;
    }
}
