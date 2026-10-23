import { Suspense } from 'react';
import type { Metadata } from 'next';
import './page.scss';
import { StudentImport } from '@/components/forms/StudentImport/StudentImport';
import { PageHeading } from '@/components/layout/PageHeading/PageHeading';
import { StudentsTable } from '@/components/tables/StudentsTable/StudentsTable';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/Card/Card';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import { requireAdminPage } from '@/services/server/auth';
import { MAX_IMPORT_CSV_LENGTH, MAX_IMPORT_ROWS } from '@/types/admin';

export const metadata: Metadata = { title: 'Students' };

const STUDENTS_PAGE_SIZE = 25;

export default async function Page() {
    await requireAdminPage();

    return (
        <div className="students-page">
            <PageHeading
                title="Students"
                description="Students pick their name on the booking page. Import the list from a CSV file; students already listed are kept as they are."
            />

            <Card className="students-page-card">
                <CardHeader>
                    <CardTitle role="heading" aria-level={2}>
                        Import from CSV
                    </CardTitle>
                    <CardDescription>
                        One row per student with the columns name, group and id number. A student is
                        matched by group and id number.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <StudentImport
                        limits={{ maxRows: MAX_IMPORT_ROWS, maxCsvLength: MAX_IMPORT_CSV_LENGTH }}
                    />
                </CardContent>
            </Card>

            <Card className="students-page-list">
                <CardHeader className="students-page-list-header">
                    <CardTitle role="heading" aria-level={2}>
                        All students
                    </CardTitle>
                    <CardDescription>
                        Everyone who can be picked on the booking page, and whether they have
                        booked.
                    </CardDescription>
                </CardHeader>
                <Suspense fallback={<Skeleton height={420} className="students-page-fallback" />}>
                    <StudentsTable pageSize={STUDENTS_PAGE_SIZE} />
                </Suspense>
            </Card>
        </div>
    );
}
