'use client';
import { useId, type ComponentProps, type FormEvent, type ReactNode } from 'react';
import './form.scss';
import { FieldError } from '@/components/forms/FieldError/FieldError';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Label } from '@/components/ui/Label/Label';
import { useHydrated } from '@/hooks/useHydrated';
import { classNames } from '@/utils/class-names';

export function readTextFields<Field extends string>(
    formData: FormData,
    fields: readonly Field[],
): Record<Field, string> {
    const entries = fields.map((field) => [field, String(formData.get(field) ?? '')]);

    return Object.fromEntries(entries) as Record<Field, string>;
}

export function fieldErrorsFromIssues(
    issues: readonly { path: readonly PropertyKey[]; message: string }[],
): Record<string, string> {
    const messages: Record<string, string> = {};

    for (const issue of issues) messages[issue.path.join('.')] ??= issue.message;

    return messages;
}

export function Form({
    className,
    onValues,
    ...props
}: Omit<ComponentProps<'form'>, 'onSubmit' | 'method'> & {
    onValues: (formData: FormData) => void | Promise<void>;
}) {
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onValues(new FormData(event.currentTarget));
    };

    return (
        <form
            method="post"
            noValidate
            className={classNames('form', className)}
            onSubmit={handleSubmit}
            {...props}
        />
    );
}

export function FormField({
    name,
    label,
    hint,
    error,
    icon,
    adornment,
    className,
    ...inputProps
}: Omit<ComponentProps<'input'>, 'id' | 'name'> & {
    name: string;
    label: ReactNode;
    hint?: ReactNode;
    error?: string;
    icon?: ReactNode;
    adornment?: ReactNode;
}) {
    const inputId = useId();
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
        <div className={classNames('form-field', className)}>
            <Label htmlFor={inputId}>{label}</Label>
            <div
                className="form-field-control"
                data-icon={icon ? true : undefined}
                data-adornment={adornment ? true : undefined}
            >
                {icon && (
                    <span className="form-field-icon" aria-hidden="true">
                        {icon}
                    </span>
                )}
                <Input
                    id={inputId}
                    name={name}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : hint ? hintId : undefined}
                    {...inputProps}
                />
                {adornment && <span className="form-field-adornment">{adornment}</span>}
            </div>
            {hint && !error && (
                <p id={hintId} className="form-field-hint">
                    {hint}
                </p>
            )}
            <FieldError id={errorId} message={error} />
        </div>
    );
}

export function FormSubmit({ disabled, ...props }: ComponentProps<typeof Button>) {
    const isHydrated = useHydrated();

    return <Button type="submit" disabled={disabled || !isHydrated} {...props} />;
}
