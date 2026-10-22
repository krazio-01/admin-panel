'use client';
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

type TurnstileApi = {
    render: (
        container: HTMLElement,
        options: {
            sitekey: string;
            callback: (token: string) => void;
            'expired-callback': () => void;
            'error-callback': () => void;
        },
    ) => string;
    remove: (widgetId: string) => void;
};

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function Turnstile({
    siteKey,
    loadAttempt,
    onToken,
    onError,
}: {
    siteKey: string;
    loadAttempt: number;
    onToken: (token: string | undefined) => void;
    onError: () => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const callbacksRef = useRef({ onToken, onError });
    const [hasTurnstileApi] = useState(() => Boolean(window.turnstile));
    const [isScriptReady, setIsScriptReady] = useState(hasTurnstileApi);

    const scriptSource =
        loadAttempt === 0 || hasTurnstileApi ? SCRIPT_URL : `${SCRIPT_URL}&attempt=${loadAttempt}`;

    useEffect(() => {
        callbacksRef.current = { onToken, onError };
    }, [onToken, onError]);

    useEffect(() => {
        const container = containerRef.current;

        if (!isScriptReady || !container || !window.turnstile) return;

        const widgetId = window.turnstile.render(container, {
            sitekey: siteKey,
            callback: (token) => callbacksRef.current.onToken(token),
            'expired-callback': () => callbacksRef.current.onToken(undefined),
            'error-callback': () => callbacksRef.current.onError(),
        });

        return () => window.turnstile?.remove(widgetId);
    }, [siteKey, isScriptReady]);

    return (
        <>
            <Script
                src={scriptSource}
                strategy="afterInteractive"
                onReady={() => setIsScriptReady(true)}
                onError={() => callbacksRef.current.onError()}
            />
            <div ref={containerRef} />
        </>
    );
}
