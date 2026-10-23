import { withDomainErrors } from '@/lib/errors';
import { clientIp, enforceRateLimit } from '@/providers/rate-limit';
import { writeAudit } from '@/lib/logger';
import { requireAdminMutation, requireAdminSession } from '@/services/server/auth';
import {
    importStudentsCsv,
    listAvailableStudents,
    listStudents,
    studentListQuerySchema,
} from '@/services/server/students';
import { importStudentsSchema } from '@/types/admin';
import { parseBody, parseQuery } from '@/utils/http';

export const dynamic = 'force-dynamic';

export const GET = withDomainErrors(async (request: Request) => {
    const searchParams = new URL(request.url).searchParams;
    const isPublicPicker = searchParams.get('booked') === 'false' && searchParams.size === 1;

    if (isPublicPicker) {
        await enforceRateLimit('studentsList', clientIp(request));

        return Response.json(await listAvailableStudents(), {
            headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' },
        });
    }

    await requireAdminSession();

    return Response.json(await listStudents(parseQuery(request, studentListQuerySchema)), {
        headers: { 'Cache-Control': 'no-store' },
    });
});

export const POST = withDomainErrors(async (request: Request) => {
    const admin = await requireAdminMutation(request);
    const { csv } = await parseBody(request, importStudentsSchema);
    const result = await importStudentsCsv(csv);
    await writeAudit({
        actor: `admin:${admin.userId}`,
        action: 'admin.import_students',
        details: `inserted ${result.inserted}, skipped ${result.skipped}, errors ${result.errors.length}`,
        ip: clientIp(request),
    });

    return Response.json(result, { status: 201 });
});
