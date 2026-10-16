import pino, { type LoggerOptions } from 'pino';

const LOG_REDACT_PATHS = [
    'aadhaar',
    'aadhaarEncrypted',
    'phone',
    'email',
    'password',
    'pin',
    'token',
    'qrToken',
    '*.aadhaar',
    '*.aadhaarEncrypted',
    '*.phone',
    '*.email',
    '*.password',
    '*.pin',
    '*.token',
    '*.qrToken',
    'guests[*].aadhaar',
    'guests[*].aadhaarEncrypted',
    'guests[*].phone',
    'guests[*].email',
    '*.guests[*].aadhaar',
    '*.guests[*].aadhaarEncrypted',
    '*.guests[*].phone',
    '*.guests[*].email',
    'req.headers.cookie',
    'req.headers.authorization',
];

export const loggerOptions: LoggerOptions = {
    level: process.env.LOG_LEVEL ?? 'info',
    redact: { paths: LOG_REDACT_PATHS, censor: '[redacted]' },
};

export const logger = pino(loggerOptions);
