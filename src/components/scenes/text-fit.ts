const MINIMUM_FONT_SIZE = 24;

export function fitLabelFontSize(
    text: string,
    maxWidth: number,
    baseSize: number,
    measure: (text: string, size: number) => number,
): number {
    const largestSize = Math.floor(baseSize);
    const smallestSize = Math.min(largestSize, MINIMUM_FONT_SIZE);

    for (let size = largestSize; size > smallestSize; size -= 1) {
        if (measure(text, size) <= maxWidth) return size;
    }

    return smallestSize;
}
