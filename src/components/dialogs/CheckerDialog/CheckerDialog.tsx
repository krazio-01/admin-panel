'use client';
import { useId, useState } from 'react';
import './checkerDialog.scss';
import { FieldError } from '@/components/forms/FieldError/FieldError';
import {
    fieldErrorsFromIssues,
    Form,
    FormField,
    FormSubmit,
    readTextFields,
} from '@/components/forms/Form/Form';
import { Button } from '@/components/ui/Button/Button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/Dialog/Dialog';
import { ApiError, api, fieldErrorsOf } from '@/services/client/api';
import {
    createCheckerSchema,
    renameCheckerSchema,
    resetCheckerPasswordSchema,
    type CheckerRow,
} from '@/types/admin';

export type CheckerDialogTarget =
    { mode: 'add' } | { mode: 'rename' | 'resetPassword'; checker: CheckerRow };

export type CheckerDialogMode = CheckerDialogTarget['mode'];

type CheckerField = 'name' | 'username' | 'password';

type FieldConfig = { label: string; type: string; autoComplete: string; hint?: string };

type SavePlan = { errors: Record<string, string>; save?: () => Promise<CheckerRow> };

const FIELDS: Record<CheckerField, FieldConfig> = {
    name: { label: 'Name', type: 'text', autoComplete: 'off' },
    username: {
        label: 'Username',
        type: 'text',
        autoComplete: 'off',
        hint: '3-32 lowercase letters, digits, dots, dashes or underscores.',
    },
    password: {
        label: 'Password',
        type: 'password',
        autoComplete: 'new-password',
        hint: 'At least 10 characters. Share it with the checker in person.',
    },
};

const MODES: Record<
    CheckerDialogMode,
    { title: string; submitLabel: string; fields: CheckerField[] }
> = {
    add: {
        title: 'Add checker',
        submitLabel: 'Add checker',
        fields: ['name', 'username', 'password'],
    },
    rename: { title: 'Rename checker', submitLabel: 'Save name', fields: ['name'] },
    resetPassword: { title: 'Reset password', submitLabel: 'Reset password', fields: ['password'] },
};

function describeTarget(target: CheckerDialogTarget): string {
    if (target.mode === 'add')
        return 'Checkers sign in on their phones to scan passes at the gate.';

    if (target.mode === 'rename') return `Change the name shown for ${target.checker.username}.`;

    return `Set a new password for ${target.checker.name}. They are signed out everywhere.`;
}

function planSave(target: CheckerDialogTarget, formData: FormData): SavePlan {
    const values = readTextFields(formData, MODES[target.mode].fields);

    if (target.mode === 'add') {
        const result = createCheckerSchema.safeParse(values);

        return result.success
            ? { errors: {}, save: () => api.checkers.create(result.data) }
            : { errors: fieldErrorsFromIssues(result.error.issues) };
    }

    const result =
        target.mode === 'rename'
            ? renameCheckerSchema.safeParse(values)
            : resetCheckerPasswordSchema.safeParse(values);

    return result.success
        ? { errors: {}, save: () => api.checkers.update(target.checker.id, result.data) }
        : { errors: fieldErrorsFromIssues(result.error.issues) };
}

function CheckerForm({
    target,
    onSaved,
}: {
    target: CheckerDialogTarget;
    onSaved: (checker: CheckerRow) => void;
}) {
    const formErrorId = useId();
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
    const [formError, setFormError] = useState<string>();
    const [isSaving, setIsSaving] = useState(false);

    const mode = MODES[target.mode];

    const submit = async (formData: FormData) => {
        const { errors, save } = planSave(target, formData);

        setFieldErrors(errors);
        setFormError(undefined);

        if (!save) return;

        setIsSaving(true);

        try {
            onSaved(await save());
        } catch (error) {
            if (!(error instanceof ApiError)) throw error;

            const serverErrors =
                error.code === 'username_taken'
                    ? { username: error.message }
                    : fieldErrorsOf(error);

            setFieldErrors(serverErrors);
            setFormError(Object.keys(serverErrors).length ? undefined : error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Form className="checker-dialog-form" onValues={submit}>
            <DialogHeader>
                <DialogTitle>{mode.title}</DialogTitle>
                <DialogDescription>{describeTarget(target)}</DialogDescription>
            </DialogHeader>

            <div className="checker-dialog-fields">
                {mode.fields.map((field) => (
                    <FormField
                        key={field}
                        name={field}
                        label={FIELDS[field].label}
                        hint={FIELDS[field].hint}
                        error={fieldErrors[field]}
                        type={FIELDS[field].type}
                        autoComplete={FIELDS[field].autoComplete}
                        autoCapitalize="none"
                        spellCheck={false}
                        defaultValue={
                            target.mode === 'rename' && field === 'name'
                                ? target.checker.name
                                : undefined
                        }
                    />
                ))}
            </div>

            <FieldError id={formErrorId} message={formError} />

            <DialogFooter>
                <DialogClose render={<Button variant="outline" disabled={isSaving} />}>
                    Cancel
                </DialogClose>
                <FormSubmit loading={isSaving}>{mode.submitLabel}</FormSubmit>
            </DialogFooter>
        </Form>
    );
}

export function CheckerDialog({
    target,
    onClose,
    onSaved,
}: {
    target: CheckerDialogTarget | null;
    onClose: () => void;
    onSaved: (checker: CheckerRow, mode: CheckerDialogMode) => void;
}) {
    const [shown, setShown] = useState({ target, version: 0 });
    const shownTarget = shown.target;

    if (target && target !== shownTarget) setShown({ target, version: shown.version + 1 });

    return (
        <Dialog
            open={target !== null}
            onOpenChange={(isOpen) => !isOpen && onClose()}
            onOpenChangeComplete={(isOpen) =>
                !isOpen && setShown((current) => ({ ...current, target: null }))
            }
        >
            <DialogContent className="checker-dialog">
                {shownTarget && (
                    <CheckerForm
                        key={shown.version}
                        target={shownTarget}
                        onSaved={(checker) => onSaved(checker, shownTarget.mode)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
