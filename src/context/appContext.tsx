'use client';
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
    createAppStore,
    type AppSliceKey,
    type AppSlices,
    type AppState,
    type AppStore,
} from '@/context/appStore';

const AppContext = createContext<AppStore | null>(null);

export function AppProvider({
    initialState,
    children,
}: {
    initialState: AppState;
    children: ReactNode;
}) {
    const [store] = useState(() => createAppStore(initialState));

    return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}

function useAppStore(): AppStore {
    const store = useContext(AppContext);

    if (!store) throw new Error('useAppContext must be used inside AppProvider');

    return store;
}

export function useAppContext<Key extends AppSliceKey>(key: Key): AppSlices[Key] {
    const store = useAppStore();

    const readSlice = () => store.getState()[key];
    const slice = useSyncExternalStore(store.subscribe, readSlice, readSlice);

    if (!slice) throw new Error(`App slice "${key}" is not provided`);

    return slice;
}

export function useUpdateAppContext(): AppStore['updateSlice'] {
    return useAppStore().updateSlice;
}
