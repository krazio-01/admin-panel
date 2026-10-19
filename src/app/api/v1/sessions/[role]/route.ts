import { cookies } from 'next/headers';
import { getEnv } from '@/lib/env';
import { NotFoundError, withDomainErrors } from '@/lib/errors';
import { SESSION_COOKIE_BY_ROLE } from '@/lib/security/tokens';
import { assertSameOrigin } from '@/utils/http';

export const dynamic = 'force-dynamic';

export const DELETE = withDomainErrors(
    async (request: Request, context: { params: Promise<{ role: string }> }) => {
        assertSameOrigin(request, getEnv().APP_URL);

        const { role } = await context.params;
        if (role !== 'admin' && role !== 'checker') throw new NotFoundError('Unknown session');

        (await cookies()).delete(SESSION_COOKIE_BY_ROLE[role]);

        return new Response(null, { status: 204 });
    },
);
