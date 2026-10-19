import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { getEnv } from '@/lib/env';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const AUTH_TAG_BYTES = 16;

function loadKey(): { key: Buffer; keyId: string } {
    const { FIELD_ENCRYPTION_KEY, FIELD_ENCRYPTION_KEY_ID } = getEnv();
    const key = Buffer.from(FIELD_ENCRYPTION_KEY, 'base64');
    if (key.length !== KEY_BYTES) {
        throw new Error(
            `FIELD_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}`,
        );
    }

    return { key, keyId: FIELD_ENCRYPTION_KEY_ID };
}

export function encryptField(plaintext: string): string {
    const { key, keyId } = loadKey();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_BYTES });
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [
        keyId,
        iv.toString('base64'),
        cipher.getAuthTag().toString('base64'),
        ciphertext.toString('base64'),
    ].join(':');
}

export function decryptField(payload: string): string {
    const { key, keyId: currentKeyId } = loadKey();
    const parts = payload.split(':');
    if (parts.length !== 4) throw new Error('Malformed encrypted payload');

    const [keyId, ivEncoded, authTagEncoded, ciphertextEncoded] = parts;
    if (keyId !== currentKeyId) throw new Error('Unknown encryption key id');

    const iv = Buffer.from(ivEncoded, 'base64');
    const authTag = Buffer.from(authTagEncoded, 'base64');

    if (iv.length !== IV_BYTES) throw new Error('Malformed encrypted payload: invalid IV length');

    if (authTag.length !== AUTH_TAG_BYTES) {
        throw new Error('Malformed encrypted payload: invalid auth tag length');
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_BYTES });
    decipher.setAuthTag(authTag);

    return Buffer.concat([
        decipher.update(Buffer.from(ciphertextEncoded, 'base64')),
        decipher.final(),
    ]).toString('utf8');
}
