import type { z } from 'zod';
import type { BookingConfirmation } from '@/services/server/bookings';
import type { CheckerRow } from '@/services/server/checkers';
import type { CheckInResult } from '@/services/server/checkin';
import type { EmailDelivery } from '@/services/server/emails';
import type { EventSettings } from '@/services/server/settings';
import type { ImportResult, StudentOption } from '@/services/server/students';
import type {
    createCheckerSchema,
    CreateSessionInput,
    updateCheckerSchema,
    updateSettingsSchema,
} from '@/types/admin';
import type { CreateBookingFormValues } from '@/types/booking';

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

type RequestOptions = {
    method?: string;
    json?: unknown;
    headers?: Record<string, string>;
    acceptedStatuses?: number[];
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const hasBody = options.json !== undefined;
    const response = await fetch(path, {
        method: options.method ?? (hasBody ? 'POST' : 'GET'),
        headers: { ...(hasBody && { 'Content-Type': 'application/json' }), ...options.headers },
        body: hasBody ? JSON.stringify(options.json) : undefined,
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

const API_ROOT = '/api/v1';

export const api = {
    students: {
        listAvailable: (): Promise<StudentOption[]> =>
            apiRequest<StudentOption[]>(`${API_ROOT}/students?booked=false`),
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
            role: CreateSessionInput['role'],
            username: string,
            password: string,
        ): Promise<{ role: CreateSessionInput['role']; expiresInSeconds: number }> =>
            apiRequest(`${API_ROOT}/sessions`, { json: { role, username, password } }),
        delete: (role: CreateSessionInput['role']): Promise<void> =>
            apiRequest<void>(`${API_ROOT}/sessions/${encodeURIComponent(role)}`, {
                method: 'DELETE',
            }),
    },
    checkers: {
        create: (values: z.input<typeof createCheckerSchema>): Promise<CheckerRow> =>
            apiRequest<CheckerRow>(`${API_ROOT}/checkers`, { json: values }),
        update: (id: string, changes: z.input<typeof updateCheckerSchema>): Promise<CheckerRow> =>
            apiRequest<CheckerRow>(`${API_ROOT}/checkers/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                json: changes,
            }),
    },
    settings: {
        update: (values: z.input<typeof updateSettingsSchema>): Promise<EventSettings> =>
            apiRequest<EventSettings>(`${API_ROOT}/settings`, { method: 'PUT', json: values }),
    },
};
