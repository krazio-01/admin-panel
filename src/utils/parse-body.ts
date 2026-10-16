import type { z } from 'zod';
import { ValidationError } from '@/lib/errors/domain-errors';

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
