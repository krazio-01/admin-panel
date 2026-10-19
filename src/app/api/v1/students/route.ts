import { ValidationError, withDomainErrors } from '@/lib/errors';
import { clientIp, enforceRateLimit } from '@/providers/rate-limit';
import { writeAudit } from '@/services/server/audit';
import { requireAdminMutation } from '@/services/server/auth';
import { importStudentsCsv, listAvailableStudents } from '@/services/server/students';
import { importStudentsSchema } from '@/types/admin';
import { parseBody } from '@/utils/http';

export const dynamic = 'force-dynamic';

export const GET = withDomainErrors(async (request: Request) => {
    await enforceRateLimit('studentsList', clientIp(request));

    if (new URL(request.url).searchParams.get('booked') !== 'false') {
        throw new ValidationError([{ path: 'booked', message: 'Only booked=false is supported' }]);
    }

    return Response.json(await listAvailableStudents(), {
        headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' },
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
