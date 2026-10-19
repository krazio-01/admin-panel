import type { z } from 'zod';
import { ForbiddenOriginError, ValidationError } from '@/lib/errors';
import { idempotencyKeySchema } from '@/types/booking';

export function getClientIp(headers: Headers, trustedProxyHops = 1): string {
    const forwardedFor = headers.get('x-forwarded-for') ?? '';
    const addresses = forwardedFor.split(',').map((address) => address.trim());
    const hops = addresses.filter((address) => address !== '');
    return hops[hops.length - trustedProxyHops] ?? headers.get('x-real-ip') ?? 'unknown';
}

export function assertSameOrigin(request: Request, appUrl: string): void {
    if (request.headers.get('origin') !== new URL(appUrl).origin) throw new ForbiddenOriginError();
}

export function assertSameOriginFetch(request: Request): void {
    if (request.headers.get('sec-fetch-site') !== 'same-origin') throw new ForbiddenOriginError();
}

export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
    const body: unknown = await request.json().catch(() => undefined);
    const result = schema.safeParse(body);
    if (!result.success) {
        throw new ValidationError(
            result.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            })),
        );
    }

    return result.data;
}

export function parseIdempotencyKey(headers: Headers): string {
    const result = idempotencyKeySchema.safeParse(headers.get('Idempotency-Key'));
    if (!result.success) {
        throw new ValidationError([
            { path: 'Idempotency-Key', message: 'A UUID Idempotency-Key header is required' },
        ]);
    }

    return result.data;
}
