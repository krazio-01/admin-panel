'use client';
import { useId, useState, type ReactNode } from 'react';
import './confirmDialog.scss';
import { FieldError } from '@/components/forms/FieldError/FieldError';
import { Form, FormSubmit } from '@/components/forms/Form/Form';
import { Button, type ButtonVariant } from '@/components/ui/Button/Button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/Dialog/Dialog';
import { Input } from '@/components/ui/Input/Input';
import { Label } from '@/components/ui/Label/Label';

export type ConfirmRequest = {
    title: string;
    description: ReactNode;
    confirmLabel: string;
    tone?: 'default' | 'destructive';
    confirmPhrase?: string;
    onConfirm: () => Promise<void>;
};

const CONFIRM_VARIANTS: Record<NonNullable<ConfirmRequest['tone']>, ButtonVariant> = {
    default: 'default',
    destructive: 'destructive',
};

export function ConfirmDialog({
    request,
    onClose,
}: {
    request: ConfirmRequest | null;
    onClose: () => void;
}) {
    const fieldId = useId();
    const [shownRequest, setShownRequest] = useState(request);
    const [typedPhrase, setTypedPhrase] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>();

    if (request && request !== shownRequest) {
        setShownRequest(request);
        setTypedPhrase('');
        setErrorMessage(undefined);
    }

    const confirmPhrase = shownRequest?.confirmPhrase;
    const isPhraseMissing = Boolean(confirmPhrase) && typedPhrase !== confirmPhrase;
    const errorId = `${fieldId}-error`;

    const confirm = async () => {
        if (!shownRequest || isPhraseMissing || isConfirming) return;

        setIsConfirming(true);
        setErrorMessage(undefined);

        try {
            await shownRequest.onConfirm();
            onClose();
        } catch (error) {
            setErrorMessage((error as Error).message);
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <Dialog
            open={request !== null}
            onOpenChange={(isOpen) => !isOpen && !isConfirming && onClose()}
            onOpenChangeComplete={(isOpen) => !isOpen && setShownRequest(null)}
        >
            <DialogContent className="confirm-dialog" showCloseButton={false}>
                <Form className="confirm-dialog-form" onValues={confirm}>
                    <DialogHeader>
                        <DialogTitle>{shownRequest?.title}</DialogTitle>
                        <DialogDescription>{shownRequest?.description}</DialogDescription>
                    </DialogHeader>

                    {confirmPhrase && (
                        <div className="confirm-dialog-phrase">
                            <Label htmlFor={fieldId}>
                                Type <span className="confirm-dialog-code">{confirmPhrase}</span> to
                                confirm
                            </Label>
                            <Input
                                id={fieldId}
                                value={typedPhrase}
                                autoComplete="off"
                                autoCapitalize="characters"
                                spellCheck={false}
                                onChange={(event) => setTypedPhrase(event.target.value)}
                            />
                        </div>
                    )}

                    <FieldError id={errorId} message={errorMessage} />

                    <DialogFooter>
                        <DialogClose render={<Button variant="outline" disabled={isConfirming} />}>
                            Cancel
                        </DialogClose>
                        <FormSubmit
                            variant={CONFIRM_VARIANTS[shownRequest?.tone ?? 'default']}
                            disabled={isPhraseMissing}
                            loading={isConfirming}
                        >
                            {shownRequest?.confirmLabel}
                        </FormSubmit>
                    </DialogFooter>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
