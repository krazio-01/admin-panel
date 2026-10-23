'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { m, useReducedMotion } from 'motion/react';
import { PlusIcon } from 'lucide-react';
import './checkersTable.scss';
import type {
    CheckerDialogMode,
    CheckerDialogTarget,
} from '@/components/dialogs/CheckerDialog/CheckerDialog';
import type { ConfirmRequest } from '@/components/dialogs/ConfirmDialog/ConfirmDialog';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { Switch } from '@/components/ui/Switch/Switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/Table/Table';
import { useToast, type ToastOptions } from '@/components/ui/Toast/Toast';
import { useRefreshSlice } from '@/context/appContext';
import { useUrlQuery } from '@/hooks/useUrlQuery';
import { api } from '@/services/client/api';
import type { CheckerRow } from '@/types/admin';
import { formatDate } from '@/utils/dates';
import { DURATION, EASE_OUT } from '@/utils/motion';

const CheckerDialog = dynamic(
    () =>
        import('@/components/dialogs/CheckerDialog/CheckerDialog').then(
            (module) => module.CheckerDialog,
        ),
    { ssr: false },
);

const ConfirmDialog = dynamic(
    () =>
        import('@/components/dialogs/ConfirmDialog/ConfirmDialog').then(
            (module) => module.ConfirmDialog,
        ),
    { ssr: false },
);

const ADD_TARGET: CheckerDialogTarget = { mode: 'add' };

const COLUMN_COUNT = 5;

const SAVED_TOASTS: Record<CheckerDialogMode, (checker: CheckerRow) => ToastOptions> = {
    add: (checker) => ({
        title: 'Checker added',
        description: `${checker.name} can sign in as ${checker.username}.`,
        tone: 'success',
    }),
    rename: (checker) => ({ title: 'Checker renamed', description: checker.name, tone: 'success' }),
    resetPassword: (checker) => ({
        title: 'Password reset',
        description: `${checker.name} was signed out on every device.`,
        tone: 'success',
    }),
};

export function CheckersTable({ checkers }: { checkers: CheckerRow[] }) {
    const { searchParams, updateQuery } = useUrlQuery();
    const prefersReducedMotion = useReducedMotion();
    const refreshSlice = useRefreshSlice();
    const { toast } = useToast();
    const [rowState, setRowState] = useState({ source: checkers, rows: checkers });
    const [dialogTarget, setDialogTarget] = useState<CheckerDialogTarget | null>(null);
    const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [hasOpenedDialog, setHasOpenedDialog] = useState(false);
    const [hasOpenedConfirm, setHasOpenedConfirm] = useState(false);

    const isAddRequested = searchParams.get('add') === '1';
    const shownDialogTarget = dialogTarget ?? (isAddRequested ? ADD_TARGET : null);

    if (rowState.source !== checkers) setRowState({ source: checkers, rows: checkers });

    if (shownDialogTarget && !hasOpenedDialog) setHasOpenedDialog(true);

    const applySavedChecker = (checker: CheckerRow) => {
        setRowState((current) => {
            const exists = current.rows.some((row) => row.id === checker.id);
            const rows = exists
                ? current.rows.map((row) => (row.id === checker.id ? checker : row))
                : [...current.rows, checker];

            return { ...current, rows };
        });

        refreshSlice('dashboard');
    };

    const closeDialog = () => {
        setDialogTarget(null);

        if (isAddRequested) updateQuery({ add: undefined });
    };

    const handleSaved = (checker: CheckerRow, mode: CheckerDialogMode) => {
        applySavedChecker(checker);
        closeDialog();
        toast(SAVED_TOASTS[mode](checker));
    };

    const setActive = async (row: CheckerRow, active: boolean) => {
        setUpdatingId(row.id);

        try {
            applySavedChecker(await api.checkers.update(row.id, { active }));
            toast({
                title: active ? 'Checker enabled' : 'Checker disabled',
                description: active
                    ? `${row.name} can sign in again.`
                    : `${row.name} was signed out and cannot sign in.`,
                tone: 'success',
            });
        } finally {
            setUpdatingId(null);
        }
    };

    const enable = async (row: CheckerRow) => {
        try {
            await setActive(row, true);
        } catch (error) {
            toast({
                title: 'The checker could not be enabled',
                description: (error as Error).message,
                tone: 'error',
            });
        }
    };

    const confirmDisable = (row: CheckerRow) => {
        setHasOpenedConfirm(true);
        setConfirmRequest({
            title: 'Disable this checker?',
            description: `${row.name} is signed out at once and cannot sign in until you enable them again.`,
            confirmLabel: 'Disable',
            tone: 'destructive',
            onConfirm: () => setActive(row, false),
        });
    };

    const openDialog = (mode: CheckerDialogMode, checker: CheckerRow) =>
        setDialogTarget({ mode, checker });

    return (
        <div className="checkers-table">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Checker</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last sign-in</TableHead>
                        <TableHead>Can sign in</TableHead>
                        <TableHead>
                            <span className="visually-hidden">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {rowState.rows.map((row) => (
                        <TableRow
                            key={row.id}
                            className="checkers-table-row"
                            data-active={row.active || undefined}
                            render={
                                <m.tr
                                    layout="position"
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: prefersReducedMotion ? 0 : DURATION.base,
                                        ease: EASE_OUT,
                                    }}
                                />
                            }
                        >
                            <TableCell>
                                <span className="checkers-table-name">{row.name}</span>
                                <span className="checkers-table-username">{row.username}</span>
                            </TableCell>
                            <TableCell>
                                <Badge
                                    key={String(row.active)}
                                    variant={row.active ? 'success' : 'secondary'}
                                    className="checkers-table-status"
                                >
                                    {row.active ? 'Active' : 'Disabled'}
                                </Badge>
                            </TableCell>
                            <TableCell className="checkers-table-muted">
                                {row.lastLoginAt
                                    ? formatDate(new Date(row.lastLoginAt), 'weekdayDayMonthTime')
                                    : 'Never'}
                            </TableCell>
                            <TableCell>
                                <Switch
                                    checked={row.active}
                                    disabled={updatingId === row.id}
                                    aria-label={`${row.name} can sign in`}
                                    onCheckedChange={(checked) =>
                                        checked ? enable(row) : confirmDisable(row)
                                    }
                                />
                            </TableCell>
                            <TableCell>
                                <span className="checkers-table-actions">
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        aria-label={`Rename ${row.name}`}
                                        onClick={() => openDialog('rename', row)}
                                    >
                                        Rename
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        aria-label={`Reset password for ${row.name}`}
                                        onClick={() => openDialog('resetPassword', row)}
                                    >
                                        Reset password
                                    </Button>
                                </span>
                            </TableCell>
                        </TableRow>
                    ))}

                    {rowState.rows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={COLUMN_COUNT}>
                                <EmptyState
                                    title="No checkers yet"
                                    description="Add a checker so the gate team can sign in and scan passes."
                                    preview={{
                                        name: 'checkers',
                                        status: '0 active',
                                        message: 'gate team not set up',
                                    }}
                                    actions={
                                        <Button
                                            size="sm"
                                            onClick={() => setDialogTarget(ADD_TARGET)}
                                        >
                                            <PlusIcon aria-hidden="true" />
                                            Add checker
                                        </Button>
                                    }
                                />
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {hasOpenedDialog && (
                <CheckerDialog
                    target={shownDialogTarget}
                    onClose={closeDialog}
                    onSaved={handleSaved}
                />
            )}

            {hasOpenedConfirm && (
                <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
            )}
        </div>
    );
}
