import type { DashboardSnapshot } from '@/types/admin';
import type { BookingState } from '@/utils/booking-form';

export type ConnectionState = { failuresBySource: Record<string, number>; isSignedOut: boolean };

export type SignInPhase = 'idle' | 'focused' | 'submitting' | 'failed' | 'succeeded';

export type SignInPulseTone = 'soft' | 'error' | 'success';

export type SignInState = { phase: SignInPhase; pulse: number; pulseTone: SignInPulseTone };

export type SignInEvent = 'focus' | 'blur' | 'keystroke' | 'submit' | 'fail' | 'succeed';

export type AppSlices = {
    booking: BookingState;
    dashboard: DashboardSnapshot;
    connection: ConnectionState;
    signIn: SignInState;
};

export type AppSliceKey = keyof AppSlices;

export type AppState = Partial<AppSlices>;

export type SlicePatch<Key extends AppSliceKey> =
    Partial<AppSlices[Key]> | ((current: AppSlices[Key]) => Partial<AppSlices[Key]>);

export type AppStore = {
    getState: () => AppState;
    subscribe: (listener: () => void) => () => void;
    updateSlice: <Key extends AppSliceKey>(key: Key, patch: SlicePatch<Key>) => void;
    replaceSlice: <Key extends AppSliceKey>(key: Key, value: AppSlices[Key]) => void;
    registerRefresher: (key: AppSliceKey, refresh: () => void) => () => void;
    refreshSlice: (key: AppSliceKey) => void;
};

export const INITIAL_CONNECTION: ConnectionState = { failuresBySource: {}, isSignedOut: false };
export const INITIAL_SIGN_IN: SignInState = { phase: 'idle', pulse: 0, pulseTone: 'soft' };

const LOCKED_SIGN_IN_PHASES = new Set<SignInPhase>(['submitting', 'succeeded']);

export function consecutiveFailures(connection: ConnectionState): number {
    return Math.max(0, ...Object.values(connection.failuresBySource));
}

export function advanceSignIn(state: SignInState, event: SignInEvent): SignInState {
    const isLocked = LOCKED_SIGN_IN_PHASES.has(state.phase);
    const nextPulse = state.pulse + 1;

    switch (event) {
        case 'focus':
            return state.phase === 'idle' ? { ...state, phase: 'focused' } : state;
        case 'blur':
            return isLocked ? state : { ...state, phase: 'idle' };
        case 'keystroke':
            return {
                phase: state.phase === 'failed' ? 'focused' : state.phase,
                pulse: nextPulse,
                pulseTone: 'soft',
            };
        case 'submit':
            return { ...state, phase: 'submitting' };
        case 'fail':
            return { phase: 'failed', pulse: nextPulse, pulseTone: 'error' };
        case 'succeed':
            return { phase: 'succeeded', pulse: nextPulse, pulseTone: 'success' };
    }
}

export function createAppStore(initialState: AppState): AppStore {
    let state = initialState;
    const listeners = new Set<() => void>();
    const refreshers = new Map<AppSliceKey, () => void>();

    const setState = (nextState: AppState) => {
        state = nextState;
        listeners.forEach((listener) => listener());
    };

    return {
        getState: () => state,
        subscribe: (listener) => {
            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },
        updateSlice: (key, patch) => {
            const current = state[key];

            if (!current) throw new Error(`App slice "${key}" is not provided`);

            const changes = typeof patch === 'function' ? patch(current) : patch;
            if (changes === current) return;

            setState({ ...state, [key]: { ...current, ...changes } });
        },
        replaceSlice: (key, value) => setState({ ...state, [key]: value }),
        registerRefresher: (key, refresh) => {
            refreshers.set(key, refresh);

            return () => {
                if (refreshers.get(key) === refresh) refreshers.delete(key);
            };
        },
        refreshSlice: (key) => refreshers.get(key)?.(),
    };
}
