'use client';
import { useCallback, type ReactNode } from 'react';
import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import { CircleAlertIcon, CircleCheckIcon, XIcon } from 'lucide-react';
import './toast.scss';

type ToastTone = 'default' | 'success' | 'error';

type ToastOptions = { title: ReactNode; description?: ReactNode; tone?: ToastTone };

const TOAST_TIMEOUT_MS = 5000;

function ToastList() {
    const { toasts } = ToastPrimitive.useToastManager();

    return toasts.map((toast) => (
        <ToastPrimitive.Root key={toast.id} toast={toast} className="toast">
            <ToastPrimitive.Content className="toast__content">
                {toast.type === 'success' && (
                    <CircleCheckIcon className="toast__icon toast__icon--success" aria-hidden />
                )}
                {toast.type === 'error' && (
                    <CircleAlertIcon className="toast__icon toast__icon--error" aria-hidden />
                )}
                <div className="toast__text">
                    <ToastPrimitive.Title className="toast__title" />
                    <ToastPrimitive.Description className="toast__description" />
                </div>
                <ToastPrimitive.Close className="toast__close" aria-label="Dismiss">
                    <XIcon aria-hidden />
                </ToastPrimitive.Close>
            </ToastPrimitive.Content>
        </ToastPrimitive.Root>
    ));
}

function ToastProvider({ children }: { children: ReactNode }) {
    return (
        <ToastPrimitive.Provider timeout={TOAST_TIMEOUT_MS} limit={3}>
            {children}
            <ToastPrimitive.Portal>
                <ToastPrimitive.Viewport className="toast-viewport">
                    <ToastList />
                </ToastPrimitive.Viewport>
            </ToastPrimitive.Portal>
        </ToastPrimitive.Provider>
    );
}

function useToast() {
    const manager = ToastPrimitive.useToastManager();
    const { add } = manager;

    const toast = useCallback(
        ({ title, description, tone = 'default' }: ToastOptions) =>
            add({
                title,
                description,
                type: tone,
                priority: tone === 'error' ? 'high' : 'low',
            }),
        [add],
    );

    return { toast, dismiss: manager.close };
}

export { ToastProvider, useToast };
export type { ToastOptions, ToastTone };
