import type { Metadata } from 'next';
import './page.scss';
import { SettingsForm } from '@/components/forms/SettingsForm/SettingsForm';
import { PageHeading } from '@/components/layout/PageHeading/PageHeading';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/Card/Card';
import { AadhaarPurge } from '@/components/widgets/AadhaarPurge/AadhaarPurge';
import { requireAdminPage } from '@/services/server/auth';
import { getEventSettings } from '@/services/server/settings';

export const metadata: Metadata = { title: 'Settings' };

export default async function Page() {
    await requireAdminPage();

    const settings = await getEventSettings();

    return (
        <div className="settings-page">
            <PageHeading
                title="Settings"
                description="The event details, the seat grid and whether bookings are open. The booking page picks up changes within a few seconds."
            />

            <Card className="settings-page-card">
                <CardContent>
                    <SettingsForm settings={settings} />
                </CardContent>
            </Card>

            <Card className="settings-page-card" data-tone="danger">
                <CardHeader>
                    <CardTitle role="heading" aria-level={2}>
                        Danger zone
                    </CardTitle>
                    <CardDescription>Actions here cannot be undone.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AadhaarPurge />
                </CardContent>
            </Card>
        </div>
    );
}
