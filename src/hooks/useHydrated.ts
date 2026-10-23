'use client';
import { useSyncExternalStore } from 'react';

function subscribeToNothing() {
    return () => {};
}

export function useClientValue<Value>(readClientValue: () => Value, serverValue: Value): Value {
    return useSyncExternalStore(subscribeToNothing, readClientValue, () => serverValue);
}

export function useHydrated(): boolean {
    return useClientValue(() => true, false);
}
