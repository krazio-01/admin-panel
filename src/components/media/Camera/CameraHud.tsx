import type { ScanOutcome } from '@/components/widgets/ScanResult/ScanResult';
import { pluralize } from '@/utils/text';

export type CameraHudState = 'starting' | 'idle' | 'checking' | 'error' | ScanOutcome;

const HEADING_LABELS = ['33', '34', '35', 'N', '01', '02', '03'];

const FRAME_CORNERS_PATH = 'M1 16V1H16 M84 1H99V16 M99 84V99H84 M16 99H1V84';

const READOUTS: Record<Exclude<CameraHudState, 'ok'>, string> = {
    starting: 'Starting',
    idle: 'Ready',
    checking: 'Checking',
    error: 'Check failed',
    used: 'Already used',
    bad: 'Invalid',
};

function describeReadout(state: CameraHudState, guestCount: number): string {
    if (state !== 'ok') return READOUTS[state];

    return `Cleared · ${guestCount} ${pluralize(guestCount, 'guest')}`;
}

export function CameraHud({
    state,
    guestCount,
    scanKey,
}: {
    state: CameraHudState;
    guestCount: number;
    scanKey: number;
}) {
    return (
        <div className="camera-hud" data-hud-state={state} aria-hidden="true">
            <div className="camera-hud-heading">
                <div className="camera-hud-heading-scale">
                    {HEADING_LABELS.map((label) => (
                        <span key={label} className="camera-hud-heading-label">
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            <span className="camera-hud-heading-caret" />
            <span className="camera-hud-ladder" data-side="start" />
            <span className="camera-hud-ladder" data-side="end" />

            <svg
                key={scanKey}
                className="camera-hud-frame"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                <path className="camera-hud-frame-shade" d={FRAME_CORNERS_PATH} />
                <path className="camera-hud-frame-line" d={FRAME_CORNERS_PATH} />
            </svg>

            <span className="camera-hud-marker" />

            <p className="camera-hud-readout">
                <span className="camera-hud-readout-dot" />
                {describeReadout(state, guestCount)}
            </p>
        </div>
    );
}
