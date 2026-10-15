export type RateLimitRule = { max: number; windowSeconds: number };

export const RATE_LIMITS = {
    booking: { max: 10, windowSeconds: 600 },
    studentsList: { max: 60, windowSeconds: 60 },
    adminLogin: { max: 5, windowSeconds: 900 },
    guardPin: { max: 10, windowSeconds: 900 },
    scan: { max: 120, windowSeconds: 60 },
    emailVerificationSend: { max: 10, windowSeconds: 900 },
    emailVerificationPerAddress: { max: 3, windowSeconds: 900 },
    emailVerificationConfirm: { max: 30, windowSeconds: 900 },
    aadhaarReveal: { max: 30, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;
