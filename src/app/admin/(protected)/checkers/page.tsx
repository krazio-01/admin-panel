import { Suspense } from 'react';
import type { Metadata } from 'next';
import './page.scss';
import { PageHeading } from '@/components/layout/PageHeading/PageHeading';
import { CheckersTable } from '@/components/tables/CheckersTable/CheckersTable';
import { Card } from '@/components/ui/Card/Card';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import { requireAdminPage } from '@/services/server/auth';
import { listCheckers } from '@/services/server/checkers';

export const metadata: Metadata = { title: 'Checkers' };

export default async function Page() {
    await requireAdminPage();

    const checkers = await listCheckers();

    return (
        <div className="checkers-page">
            <PageHeading
                title="Checkers"
                description="Checkers sign in on their phones to scan passes at the gate. Disabling one or resetting a password signs them out at once."
            />

            <Card className="checkers-page-card">
                <Suspense fallback={<Skeleton height={240} className="checkers-page-fallback" />}>
                    <CheckersTable checkers={checkers} />
                </Suspense>
            </Card>
        </div>
    );
}
