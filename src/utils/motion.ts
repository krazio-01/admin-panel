export const DURATION = { fast: 0.15, base: 0.25, slow: 0.4 };

export const EASE_OUT: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

export const STAGGER_INTERVAL = 0.06;

export const LETTER_INTERVAL = 0.04;

export const COUNT_UP_DURATION = { first: 0.9, change: 0.4 };

export function countUpValue(target: number, progress: number): number {
    const clampedProgress = Math.min(1, Math.max(0, progress));
    const easedProgress = 1 - (1 - clampedProgress) ** 3;

    return Math.round(target * easedProgress);
}
