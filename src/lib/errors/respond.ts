import { DomainError, RateLimitedError } from './domain-errors';

export function toErrorResponse(error: DomainError): Response {
    return Response.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        {
            status: error.status,
            headers:
                error instanceof RateLimitedError
                    ? { 'Retry-After': String(error.retryAfterSeconds) }
                    : undefined,
        },
    );
}

export function withDomainErrors<Args extends unknown[]>(
    handler: (...args: Args) => Promise<Response>,
) {
    return async (...args: Args): Promise<Response> => {
        try {
            return await handler(...args);
        } catch (error) {
            if (error instanceof DomainError) return toErrorResponse(error);
            throw error;
        }
    };
}
