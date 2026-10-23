'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export type QueryChanges = Record<string, string | undefined>;

const SEARCH_DEBOUNCE_MS = 300;

export function useUrlQuery() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const updateQuery = useCallback(
        (changes: QueryChanges) => {
            const params = new URLSearchParams(window.location.search);

            for (const [key, value] of Object.entries(changes)) {
                if (value) params.set(key, value);
                else params.delete(key);
            }

            const query = params.toString();

            window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);
        },
        [pathname],
    );

    return { searchParams, queryKey: searchParams.toString(), updateQuery };
}

export function useUrlSearch(
    urlSearch: string | undefined,
    commitSearch: (search: string | undefined) => void,
) {
    const [searchText, setSearchText] = useState(urlSearch ?? '');
    const [syncedSearch, setSyncedSearch] = useState(urlSearch);
    const [pushedSearch, setPushedSearch] = useState(urlSearch);

    if (syncedSearch !== urlSearch) {
        setSyncedSearch(urlSearch);

        if (urlSearch !== pushedSearch) setSearchText(urlSearch ?? '');
    }

    useEffect(() => {
        const trimmedSearch = searchText.trim() || undefined;

        if (trimmedSearch === urlSearch) return;

        const timer = setTimeout(() => {
            setPushedSearch(trimmedSearch);
            commitSearch(trimmedSearch);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [commitSearch, searchText, urlSearch]);

    const clearSearch = () => {
        setSearchText('');
        setPushedSearch(undefined);
    };

    return { searchText, setSearchText, clearSearch };
}
