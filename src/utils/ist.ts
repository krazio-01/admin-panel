const IST_UTC_OFFSET = '+05:30';

const istFormatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

export function toIstInputValue(date: Date): string {
    return istFormatter.format(date).replace(' ', 'T');
}

export function fromIstInputValue(value: string): Date {
    return new Date(`${value}:00${IST_UTC_OFFSET}`);
}
