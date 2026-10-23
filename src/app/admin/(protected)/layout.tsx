import type { Metadata } from 'next';
import { PlusIcon, UploadIcon } from 'lucide-react';
import './layout.scss';
import { AppProvider } from '@/context/appContext';
import { LiveSlices } from '@/context/liveSlices';
import { Breadcrumb } from '@/components/layout/Header/Breadcrumb';
import { Header } from '@/components/layout/Header/Header';
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';
import { SearchMenu } from '@/components/menus/SearchMenu/SearchMenu';
import { MotionProvider } from '@/components/ui/Animations/ClientAnimations';
import { ButtonLink } from '@/components/ui/Button/Button';
import { ToastProvider } from '@/components/ui/Toast/Toast';
import { requireAdminPage } from '@/services/server/auth';
import { getDashboardSnapshot } from '@/services/server/dashboard';
import { ADMIN_ROOT_HREF, ADMIN_SIGN_IN_HREF } from '@/components/layout/navigation';

export const metadata: Metadata = { title: 'Admin console' };

const DASHBOARD_POLL_MS = 5000;

export default async function Layout({ children }: LayoutProps<'/admin'>) {
    const session = await requireAdminPage();
    const dashboard = await getDashboardSnapshot();

    return (
        <ToastProvider>
            <MotionProvider features="layout">
                <AppProvider initialState={{ dashboard }} signInPath={ADMIN_SIGN_IN_HREF}>
                    <LiveSlices slices={{ dashboard: DASHBOARD_POLL_MS }} />

                    <div className="console">
                        <Sidebar subtitle="Admin console" userName={session.name} />

                        <div className="console-main">
                            <Header
                                start={<Breadcrumb root="Admin" />}
                                end={
                                    <>
                                        <SearchMenu placeholder="Search pages and bookings…" />
                                        <ButtonLink
                                            variant="outline"
                                            size="sm"
                                            href={`${ADMIN_ROOT_HREF}/students`}
                                            className="console-import"
                                        >
                                            <UploadIcon aria-hidden="true" />
                                            Import students
                                        </ButtonLink>
                                        <ButtonLink
                                            size="sm"
                                            href={`${ADMIN_ROOT_HREF}/checkers?add=1`}
                                        >
                                            <PlusIcon aria-hidden="true" />
                                            Add checker
                                        </ButtonLink>
                                    </>
                                }
                            />

                            <div className="console-content">{children}</div>
                        </div>
                    </div>
                </AppProvider>
            </MotionProvider>
        </ToastProvider>
    );
}
