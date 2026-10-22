import { useCallback, useRef, useState } from 'react';
import type { Path, UseFormReturn } from 'react-hook-form';
import type { BookingDetailsValues, BookingStepEvent } from '@/utils/booking-form';
import { ApiError, api } from '@/services/client/api';
import type { BookingConfirmation } from '@/services/server/bookings';
import { VERIFICATION_CODE_LENGTH } from '@/types/booking';

const VERIFICATION_CODE_ERROR_CODES = new Set([
    'invalid_verification_code',
    'verification_expired',
    'verification_locked',
]);

function apiErrorMessage(error: unknown): string {
    if (error instanceof ApiError) return error.message;

    throw error;
}

function wrongCodeMessage(error: ApiError): string {
    const attemptsRemaining = (error.details as { attemptsRemaining?: number } | undefined)
        ?.attemptsRemaining;

    if (attemptsRemaining === undefined) return error.message;

    const attemptWord = attemptsRemaining === 1 ? 'attempt' : 'attempts';

    return `${error.message} ${attemptsRemaining} ${attemptWord} left.`;
}

export function useBotCheck(turnstileSiteKey?: string) {
    const [botToken, setBotToken] = useState<string>();
    const [isBotCheckActive, setIsBotCheckActive] = useState(false);
    const [turnstileResetKey, setTurnstileResetKey] = useState(0);
    const [turnstileScriptAttempt, setTurnstileScriptAttempt] = useState(0);
    const [hasBotCheckFailed, setHasBotCheckFailed] = useState(false);

    const updateBotToken = useCallback((token: string | undefined) => {
        setBotToken(token);

        if (token) setHasBotCheckFailed(false);
    }, []);

    const reportBotCheckFailure = useCallback(() => {
        setBotToken(undefined);
        setHasBotCheckFailed(true);
    }, []);

    return {
        turnstileSiteKey,
        isBotCheckActive,
        turnstileResetKey,
        turnstileScriptAttempt,
        hasBotCheckFailed,
        isWaitingForBotCheck: Boolean(turnstileSiteKey) && isBotCheckActive && !botToken,
        updateBotToken,
        reportBotCheckFailure,
        activateBotCheck: () => {
            if (turnstileSiteKey && !isBotCheckActive) setIsBotCheckActive(true);
        },
        consumeBotToken: () => {
            if (turnstileSiteKey) {
                setBotToken(undefined);
                setTurnstileResetKey((key) => key + 1);
            }

            return botToken;
        },
        retryBotCheck: () => {
            setHasBotCheckFailed(false);
            setTurnstileScriptAttempt((attempt) => attempt + 1);
            setTurnstileResetKey((key) => key + 1);
        },
    };
}

export type BotCheck = ReturnType<typeof useBotCheck>;

export function useEmailVerification({
    form,
    botCheck,
    dispatchStepEvent,
    onBooked,
}: {
    form: UseFormReturn<BookingDetailsValues>;
    botCheck: BotCheck;
    dispatchStepEvent: (event: BookingStepEvent) => void;
    onBooked: (confirmation: BookingConfirmation) => void;
}) {
    const [verification, setVerification] = useState<{ id: string; email: string } | null>(null);
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState<string>();
    const [codeNotice, setCodeNotice] = useState<string>();
    const [shakeSignal, setShakeSignal] = useState(0);
    const [formError, setFormError] = useState<string>();
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [isBooking, setIsBooking] = useState(false);

    const idempotencyKeyRef = useRef<string | null>(null);
    const verificationTokenRef = useRef<string | null>(null);
    const isBookingRef = useRef(false);

    const startVerification = async (email: string) => {
        const started = await api.emailVerifications.start(email, botCheck.consumeBotToken());

        verificationTokenRef.current = null;
        setVerification({ id: started.verificationId, email });
        setCode('');
        setCodeError(undefined);
    };

    const sendCode = async (values: BookingDetailsValues) => {
        setFormError(undefined);
        setIsSendingCode(true);

        try {
            await startVerification(values.guests[0].email.trim().toLowerCase());
            setCodeNotice(undefined);
            idempotencyKeyRef.current = null;
            dispatchStepEvent('detailsValid');
        } catch (error) {
            setFormError(apiErrorMessage(error));
        } finally {
            setIsSendingCode(false);
        }
    };

    const resendCode = async () => {
        if (!verification) return;

        setFormError(undefined);
        setIsSendingCode(true);

        try {
            await startVerification(verification.email);
            setCodeNotice('A new code is on its way.');
        } catch (error) {
            setFormError(apiErrorMessage(error));
        } finally {
            setIsSendingCode(false);
        }
    };

    const applyFieldErrors = (error: ApiError) => {
        const issues = (error.details as { path: string; message: string }[] | undefined) ?? [];

        for (const issue of issues) {
            form.setError(issue.path as Path<BookingDetailsValues>, { message: issue.message });
        }

        dispatchStepEvent('editDetails');
    };

    const handleBookingFailure = (error: unknown) => {
        if (!(error instanceof ApiError)) {
            setFormError(apiErrorMessage(error));
            return;
        }

        if (VERIFICATION_CODE_ERROR_CODES.has(error.code)) {
            setCodeError(
                error.code === 'invalid_verification_code'
                    ? wrongCodeMessage(error)
                    : error.message,
            );
            setCode('');
            setShakeSignal((signal) => signal + 1);
            return;
        }

        if (error.code === 'email_not_verified') verificationTokenRef.current = null;

        if (error.code === 'validation_failed') {
            applyFieldErrors(error);
            setFormError('Please check the highlighted details.');
            return;
        }

        setFormError(error.message);
    };

    const confirmAndBook = async (enteredCode: string) => {
        if (
            !verification ||
            isBookingRef.current ||
            botCheck.isWaitingForBotCheck ||
            enteredCode.length !== VERIFICATION_CODE_LENGTH
        ) {
            return;
        }

        isBookingRef.current = true;
        setIsBooking(true);
        setCodeError(undefined);
        setCodeNotice(undefined);
        setFormError(undefined);

        try {
            if (!verificationTokenRef.current) {
                const confirmed = await api.emailVerifications.confirm(
                    verification.id,
                    enteredCode,
                );

                verificationTokenRef.current = confirmed.verificationToken;
            }

            idempotencyKeyRef.current ??= crypto.randomUUID();

            const values = form.getValues();
            const booked = await api.bookings.create(
                {
                    studentId: values.studentId,
                    guests: values.guests,
                    botToken: botCheck.consumeBotToken(),
                    emailVerificationToken: verificationTokenRef.current,
                },
                idempotencyKeyRef.current,
            );

            onBooked(booked);
        } catch (error) {
            handleBookingFailure(error);
        } finally {
            isBookingRef.current = false;
            setIsBooking(false);
        }
    };

    return {
        verification,
        code,
        codeError,
        codeNotice,
        shakeSignal,
        formError,
        isSendingCode,
        isBooking,
        sendCode,
        resendCode,
        confirmAndBook,
        changeCode: (digits: string) => {
            setCode(digits);
            setCodeError(undefined);
        },
        editDetails: () => {
            setFormError(undefined);
            dispatchStepEvent('editDetails');
        },
    };
}

export type EmailVerification = ReturnType<typeof useEmailVerification>;
