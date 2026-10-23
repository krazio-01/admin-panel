import type {
    BookingListQuery,
    BookingPage,
    CheckerRow,
    CreateCheckerInput,
    DashboardSnapshot,
    EventSettings,
    ImportResult,
    SessionRole,
    StudentListQuery,
    StudentPage,
    UpdateCheckerInput,
    UpdateSettingsBody,
} from '@/types/admin';
import type {
    BookingConfirmation,
    CheckInResult,
    CreateBookingFormValues,
    EmailDelivery,
    StudentOption,
} from '@/types/booking';

export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        message: string,
        readonly details?: unknown,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export type FieldIssue = { path: string; message: string };

export function fieldErrorsOf(error: unknown): Record<string, string> {
    if (!(error instanceof ApiError) || !Array.isArray(error.details)) return {};

    const messages: Record<string, string> = {};

    for (const issue of error.details as FieldIssue[]) messages[issue.path] ??= issue.message;

    return messages;
}

type RequestOptions = {
    method?: string;
    json?: unknown;
    headers?: Record<string, string>;
    acceptedStatuses?: number[];
    signal?: AbortSignal;
};

type QueryValues = Record<string, string | number | boolean | undefined>;

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const hasBody = options.json !== undefined;
    const request = fetch(path, {
        method: options.method ?? (hasBody ? 'POST' : 'GET'),
        headers: { ...(hasBody && { 'Content-Type': 'application/json' }), ...options.headers },
        body: hasBody ? JSON.stringify(options.json) : undefined,
        signal: options.signal,
    });

    const response = await request.catch((networkError: unknown) => {
        throw new ApiError(
            0,
            'network_error',
            'Check your connection and try again.',
            networkError,
        );
    });

    if (!response.ok && !options.acceptedStatuses?.includes(response.status)) {
        const body = (await response.json().catch(() => undefined)) as
            { error?: { code?: string; message?: string; details?: unknown } } | undefined;

        throw new ApiError(
            response.status,
            body?.error?.code ?? 'unknown_error',
            body?.error?.message ?? 'Something went wrong. Please try again.',
            body?.error?.details,
        );
    }

    if (response.status === 204) return undefined as T;

    return (await response.json()) as T;
}

function withQuery(path: string, query: QueryValues): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== '') params.set(key, String(value));
    }

    const queryString = params.toString();

    return queryString ? `${path}?${queryString}` : path;
}

const API_ROOT = '/api/v1';

export const api = {
    students: {
        listAvailable: (): Promise<StudentOption[]> =>
            apiRequest<StudentOption[]>(`${API_ROOT}/students?booked=false`),
        list: (
            query: StudentListQuery & { pageSize: number },
            signal?: AbortSignal,
        ): Promise<StudentPage> =>
            apiRequest<StudentPage>(withQuery(`${API_ROOT}/students`, query), { signal }),
        import: (csv: string): Promise<ImportResult> =>
            apiRequest<ImportResult>(`${API_ROOT}/students`, { json: { csv } }),
    },
    emailVerifications: {
        start: (
            email: string,
            botToken?: string,
        ): Promise<{ verificationId: string; expiresInSeconds: number }> =>
            apiRequest(`${API_ROOT}/email-verifications`, { json: { email, botToken } }),
        confirm: (
            verificationId: string,
            code: string,
        ): Promise<{ verificationToken: string; expiresInSeconds: number }> =>
            apiRequest(`${API_ROOT}/email-verifications/${encodeURIComponent(verificationId)}`, {
                method: 'PATCH',
                json: { code },
            }),
    },
    bookings: {
        list: (query: BookingListQuery, signal?: AbortSignal): Promise<BookingPage> =>
            apiRequest<BookingPage>(withQuery(`${API_ROOT}/bookings`, query), { signal }),
        create: (
            values: CreateBookingFormValues,
            idempotencyKey: string,
        ): Promise<BookingConfirmation> =>
            apiRequest<BookingConfirmation>(`${API_ROOT}/bookings`, {
                json: values,
                headers: { 'Idempotency-Key': idempotencyKey },
            }),
        revealAadhaar: (
            bookingId: string,
        ): Promise<{ guests: { name: string; aadhaar: string | null }[] }> =>
            apiRequest(`${API_ROOT}/bookings/${encodeURIComponent(bookingId)}/aadhaar`),
        resendConfirmationEmail: (bookingId: string): Promise<EmailDelivery> =>
            apiRequest<EmailDelivery>(
                `${API_ROOT}/bookings/${encodeURIComponent(bookingId)}/confirmation-emails`,
                { method: 'POST' },
            ),
    },
    dashboard: {
        get: (signal?: AbortSignal): Promise<DashboardSnapshot> =>
            apiRequest<DashboardSnapshot>(`${API_ROOT}/dashboard`, { signal }),
    },
    aadhaar: {
        purge: (): Promise<{ bookingsUpdated: number }> =>
            apiRequest(`${API_ROOT}/aadhaar`, { method: 'DELETE' }),
    },
    checkIns: {
        create: (token: string): Promise<CheckInResult> =>
            apiRequest<CheckInResult>(`${API_ROOT}/check-ins`, {
                json: { token },
                acceptedStatuses: [404, 409],
            }),
    },
    sessions: {
        create: (
            role: SessionRole,
            username: string,
            password: string,
        ): Promise<{ role: SessionRole; expiresInSeconds: number }> =>
            apiRequest(`${API_ROOT}/sessions`, { json: { role, username, password } }),
        delete: (role: SessionRole): Promise<void> =>
            apiRequest<void>(`${API_ROOT}/sessions/${encodeURIComponent(role)}`, {
                method: 'DELETE',
            }),
    },
    checkers: {
        create: (values: CreateCheckerInput): Promise<CheckerRow> =>
            apiRequest<CheckerRow>(`${API_ROOT}/checkers`, { json: values }),
        update: (id: string, changes: UpdateCheckerInput): Promise<CheckerRow> =>
            apiRequest<CheckerRow>(`${API_ROOT}/checkers/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                json: changes,
            }),
    },
    settings: {
        update: (values: UpdateSettingsBody): Promise<EventSettings> =>
            apiRequest<EventSettings>(`${API_ROOT}/settings`, { method: 'PUT', json: values }),
    },
};
