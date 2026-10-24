import type { Metadata } from 'next';
import './page.scss';
import { LoginForm } from '@/components/forms/LoginForm/LoginForm';
import { Header } from '@/components/layout/Header/Header';
import { SignOutButton } from '@/components/layout/Header/SignOutButton';
import { SCANNER_HREF } from '@/components/layout/navigation';
import { Camera } from '@/components/media/Camera/Camera';
import { DotTerrain } from '@/components/scenes/DotTerrain/DotTerrain';
import { MotionProvider } from '@/components/ui/Animations/ClientAnimations';
import { Reveal } from '@/components/ui/Animations/Animations';
import { ToastProvider } from '@/components/ui/Toast/Toast';
import { GateProgress } from '@/components/widgets/GateProgress/GateProgress';
import { ScanResult, ScanTally } from '@/components/widgets/ScanResult/ScanResult';
import { AppProvider } from '@/context/appContext';
import { INITIAL_SCANNER, INITIAL_SIGN_IN } from '@/context/appStore';
import { LiveSlices } from '@/context/liveSlices';
import { CHECKER_SESSION_SECONDS } from '@/lib/security/tokens';
import { getCheckerSession } from '@/services/server/auth';
import { getGateProgress } from '@/services/server/checkIns';
import { findEventSettings } from '@/services/server/settings';
import { initials } from '@/utils/text';

export const metadata: Metadata = { title: 'Scanner' };

const GATE_PROGRESS_POLL_MS = 15000;

export default async function Page() {
    const session = await getCheckerSession();

    if (!session) {
        const settings = await findEventSettings();

        return (
            <AppProvider initialState={{ signIn: INITIAL_SIGN_IN }}>
                <MotionProvider>
                    <main>
                        <DotTerrain isFullScreen>
                            <Reveal>
                                <LoginForm
                                    role="checker"
                                    redirectTo={SCANNER_HREF}
                                    sessionSeconds={CHECKER_SESSION_SECONDS}
                                    eventName={settings?.eventName}
                                />
                            </Reveal>
                        </DotTerrain>
                    </main>
                </MotionProvider>
            </AppProvider>
        );
    }

    const gateProgress = await getGateProgress();

    return (
        <ToastProvider>
            <AppProvider
                initialState={{ scanner: INITIAL_SCANNER, gateProgress }}
                signInPath={SCANNER_HREF}
            >
                <LiveSlices slices={{ gateProgress: GATE_PROGRESS_POLL_MS }} />

                <div className="scanner">
                    <Header
                        className="scanner-header"
                        start={
                            <div className="scanner-checker">
                                <span className="scanner-checker-avatar" aria-hidden="true">
                                    {initials(session.name)}
                                </span>
                                <p className="scanner-checker-name">
                                    {session.name}
                                    <small className="scanner-checker-role">Checker</small>
                                </p>
                            </div>
                        }
                        end={<SignOutButton role="checker" redirectTo={SCANNER_HREF} />}
                    />

                    <main className="scanner-main">
                        <h1 className="visually-hidden">Scan guest passes</h1>

                        <div className="scanner-progress">
                            <GateProgress />
                        </div>

                        <div className="scanner-camera">
                            <Camera />
                        </div>

                        <div className="scanner-side">
                            <ScanResult />
                            <ScanTally checkerId={session.userId} />
                        </div>
                    </main>
                </div>
            </AppProvider>
        </ToastProvider>
    );
}
