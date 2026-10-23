'use client';
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
    createAppStore,
    INITIAL_CONNECTION,
    type AppSliceKey,
    type AppSlices,
    type AppState,
    type AppStore,
} from '@/context/appStore';

type AppRuntime = { store: AppStore; signInPath?: string };

const AppContext = createContext<AppRuntime | null>(null);

export function useAppRuntime(): AppRuntime {
    const runtime = useContext(AppContext);

    if (!runtime) throw new Error('App context hooks must be used inside AppProvider');

    return runtime;
}

export function useAppContext<Key extends AppSliceKey>(key: Key): AppSlices[Key] {
    const { store } = useAppRuntime();

    const readSlice = () => store.getState()[key];
    const slice = useSyncExternalStore(store.subscribe, readSlice, readSlice);

    if (!slice) throw new Error(`App slice "${key}" is not provided`);

    return slice;
}

export function useUpdateAppContext(): AppStore['updateSlice'] {
    return useAppRuntime().store.updateSlice;
}

export function useRefreshSlice(): AppStore['refreshSlice'] {
    return useAppRuntime().store.refreshSlice;
}

export function AppProvider({
    initialState,
    signInPath,
    children,
}: {
    initialState: AppState;
    signInPath?: string;
    children: ReactNode;
}) {
    const [runtime] = useState<AppRuntime>(() => ({
        store: createAppStore({ connection: INITIAL_CONNECTION, ...initialState }),
        signInPath,
    }));

    return <AppContext.Provider value={runtime}>{children}</AppContext.Provider>;
}
