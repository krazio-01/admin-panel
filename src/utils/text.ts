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

export function maskAadhaar(last4: string): string {
    return `XXXX XXXX ${last4}`;
}

export function formatAadhaar(digits: string): string {
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function maskEmail(email: string): string {
    const separatorIndex = email.lastIndexOf('@');
    if (separatorIndex < 1) return '*'.repeat(Math.max(email.length, 1));
    const localPart = email.slice(0, separatorIndex);
    const domain = email.slice(separatorIndex + 1);
    return `${localPart[0]}${'*'.repeat(Math.max(localPart.length - 1, 1))}@${domain}`;
}
