import type { BookingState } from '@/utils/booking-form';

export type AppSlices = {
    booking: BookingState;
};

export type AppSliceKey = keyof AppSlices;

export type AppState = Partial<AppSlices>;

export type AppStore = {
    getState: () => AppState;
    subscribe: (listener: () => void) => () => void;
    updateSlice: <Key extends AppSliceKey>(key: Key, patch: Partial<AppSlices[Key]>) => void;
};

export function createAppStore(initialState: AppState): AppStore {
    let state = initialState;
    const listeners = new Set<() => void>();

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

            state = { ...state, [key]: { ...current, ...patch } };
            listeners.forEach((listener) => listener());
        },
    };
}
