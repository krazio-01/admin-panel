import 'server-only';
import { randomBytes } from 'node:crypto';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function generateQrToken(): string {
    return randomBytes(16).toString('base64url');
}

export function isWellFormedQrToken(value: string): boolean {
    return TOKEN_PATTERN.test(value);
}
