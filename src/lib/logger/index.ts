import pino from 'pino';

export const LOG_REDACT_PATHS = [
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

export const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    redact: { paths: LOG_REDACT_PATHS, censor: '[redacted]' },
});
