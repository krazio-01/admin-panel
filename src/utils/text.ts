const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function groupCharacters(
    value: string,
    groupSizes: number | number[],
    separator = ' ',
): string {
    const sizes = Array.isArray(groupSizes) ? groupSizes : [groupSizes];
    const groups: string[] = [];
    let start = 0;

    for (let index = 0; start < value.length; index++) {
        const size = sizes[Math.min(index, sizes.length - 1)];
        groups.push(value.slice(start, start + size));
        start += size;
    }

    return groups.join(separator);
}

export function maskStart(visible: string, totalLength: number, maskCharacter = 'X'): string {
    return visible.padStart(totalLength, maskCharacter);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
    return count === 1 ? singular : plural;
}

export function maskEmail(email: string): string {
    const separatorIndex = email.lastIndexOf('@');
    if (separatorIndex < 1) return '*'.repeat(Math.max(email.length, 1));

    const localPart = email.slice(0, separatorIndex);
    const domain = email.slice(separatorIndex + 1);
    return `${localPart[0]}${'*'.repeat(Math.max(localPart.length - 1, 1))}@${domain}`;
}
