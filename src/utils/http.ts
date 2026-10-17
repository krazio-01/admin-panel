import type { z } from 'zod';
import { ForbiddenOriginError, ValidationError } from '@/lib/errors';

export function getClientIp(headers: Headers, trustedProxyHops = 1): string {
    const addresses =
        headers
            .get('x-forwarded-for')
            ?.split(',')
            .map((address) => address.trim())
            .filter((address) => address !== '') ?? [];
    return addresses[addresses.length - trustedProxyHops] ?? headers.get('x-real-ip') ?? 'unknown';
}

export function assertSameOrigin(request: Request, appUrl: string): void {
    if (request.headers.get('origin') !== new URL(appUrl).origin) throw new ForbiddenOriginError();
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
