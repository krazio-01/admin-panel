import { ForbiddenOriginError } from '@/lib/errors/domain-errors';

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
