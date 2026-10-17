export interface BotCheck {
    verify(token: string | undefined, ip: string): Promise<boolean>;
}

export function createNoopBotCheck(): BotCheck {
    return { verify: async () => true };
}

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function createTurnstileBotCheck(secret: string): BotCheck {
    return {
        async verify(token, ip) {
            if (!token) return false;
            const response = await fetch(VERIFY_URL, {
                method: 'POST',
                body: new URLSearchParams({ secret, response: token, remoteip: ip }),
            });
            const result = (await response.json()) as { success?: boolean };
            return result.success === true;
        },
    };
}
