import { cookies } from 'next/headers';
import { getEnv } from '@/lib/env';
import { withDomainErrors } from '@/lib/errors';
import {
    ADMIN_SESSION_SECONDS,
    CHECKER_SESSION_SECONDS,
    SESSION_COOKIE_BY_ROLE,
    sessionCookieOptions,
} from '@/lib/security/tokens';
import { clientIp, enforceRateLimit } from '@/providers/rate-limit';
import { createSessionSchema, loginAdmin, loginChecker } from '@/services/server/auth';
import { assertSameOrigin, parseBody } from '@/utils/http';

export const dynamic = 'force-dynamic';

const LOGIN_BY_ROLE = {
    admin: { login: loginAdmin, rateLimit: 'adminLogin', ttlSeconds: ADMIN_SESSION_SECONDS },
    checker: {
        login: loginChecker,
        rateLimit: 'checkerLogin',
        ttlSeconds: CHECKER_SESSION_SECONDS,
    },
} as const;

export const POST = withDomainErrors(async (request: Request) => {
    assertSameOrigin(request, getEnv().APP_URL);

    const { role, username, password } = await parseBody(request, createSessionSchema);
    const { login, rateLimit, ttlSeconds } = LOGIN_BY_ROLE[role];
    const ip = clientIp(request);
    await enforceRateLimit(rateLimit, ip);
    await enforceRateLimit(rateLimit, `username:${username}`);

    const token = await login(username, password, ip);
    (await cookies()).set(SESSION_COOKIE_BY_ROLE[role], token, sessionCookieOptions(ttlSeconds));

    return Response.json({ role, expiresInSeconds: ttlSeconds }, { status: 201 });
});
