'use client';
import { useCallback, useMemo, useState } from 'react';
import './studentsTable.scss';
import { FilterMenu, type FilterOption } from '@/components/menus/FilterMenu/FilterMenu';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TablePagination,
    TableRow,
    TableSearch,
    TableToolbar,
    describeTableRange,
    type TablePageRange,
} from '@/components/ui/Table/Table';
import { useAppContext } from '@/context/appContext';
import { useLivePolling } from '@/context/liveSlices';
import { useUrlQuery, useUrlSearch } from '@/hooks/useUrlQuery';
import { api } from '@/services/client/api';
import type { StudentPage } from '@/types/admin';

type BookedFilter = 'true' | 'false';

type StudentQuery = { search?: string; booked?: BookedFilter; page?: number };

type LoadedPage = { queryKey: string; page: StudentPage };

const POLL_INTERVAL_MS = 15000;
const SKELETON_ROW_COUNT = 5;
const COLUMN_COUNT = 4;

const BOOKED_OPTIONS: FilterOption<BookedFilter>[] = [
    { value: 'true', label: 'Booked' },
    { value: 'false', label: 'Not booked' },
];

function readQuery(params: URLSearchParams): StudentQuery {
    const page = Number(params.get('page'));
    const booked = params.get('booked');

    return {
        search: params.get('search')?.trim() || undefined,
        booked: BOOKED_OPTIONS.find((option) => option.value === booked)?.value,
        page: Number.isInteger(page) && page > 1 ? page : undefined,
    };
}

function toPageRange(page: StudentPage): TablePageRange {
    return {
        page: page.page,
        pageSize: page.pageSize,
        total: page.total,
        itemCount: page.items.length,
    };
}

export function StudentsTable({ pageSize }: { pageSize: number }) {
    const { queryKey, updateQuery: writeQuery } = useUrlQuery();
    const { stats } = useAppContext('dashboard');

    const query = useMemo(() => readQuery(new URLSearchParams(queryKey)), [queryKey]);

    const updateQuery = useCallback(
        (changes: Partial<Record<keyof StudentQuery, string | undefined>>) =>
            writeQuery({ page: undefined, ...changes }),
        [writeQuery],
    );

    const commitSearch = useCallback(
        (search: string | undefined) => updateQuery({ search }),
        [updateQuery],
    );

    const { searchText, setSearchText, clearSearch } = useUrlSearch(query.search, commitSearch);

    const studentCountKey = `${stats.studentsTotal}:${stats.bookings}`;

    const loadPage = useCallback(
        async (signal: AbortSignal): Promise<LoadedPage> => ({
            queryKey: `${queryKey}|${studentCountKey}`,
            page: await api.students.list(
                {
                    search: query.search,
                    booked: query.booked === undefined ? undefined : query.booked === 'true',
                    page: query.page,
                    pageSize,
                },
                signal,
            ),
        }),
        [pageSize, query, queryKey, studentCountKey],
    );

    const { data } = useLivePolling<LoadedPage | null>(loadPage, {
        intervalMs: POLL_INTERVAL_MS,
        initialData: null,
        immediate: true,
    });

    const [announcement, setAnnouncement] = useState<{ queryKey: string | null; text: string }>({
        queryKey: null,
        text: '',
    });

    const shownPage = data?.page ?? null;
    const isStale = Boolean(data) && !data?.queryKey.startsWith(`${queryKey}|`);
    const currentPage = isStale ? null : shownPage;
    const pageNumber = query.page ?? 1;
    const hasFilters = Boolean(query.search || query.booked);
    const isPastLastPage = Boolean(
        currentPage && currentPage.items.length === 0 && currentPage.total > 0,
    );

    if (currentPage && announcement.queryKey !== queryKey) {
        setAnnouncement({ queryKey, text: describeTableRange(toPageRange(currentPage)) });
    }

    const goToPage = (page: number) => updateQuery({ page: page > 1 ? String(page) : undefined });

    const clearFilters = () => {
        clearSearch();
        updateQuery({ search: undefined, booked: undefined });
    };

    return (
        <div className="students-table">
            <TableToolbar>
                <TableSearch
                    label="Search students"
                    placeholder="Search by name, group or ID number…"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                />

                <FilterMenu
                    label="Booking"
                    options={BOOKED_OPTIONS}
                    value={query.booked}
                    onValueChange={(booked) => updateQuery({ booked })}
                />
            </TableToolbar>

            <Table aria-busy={!shownPage || isStale} data-stale={isStale || undefined}>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>ID number</TableHead>
                        <TableHead>Booking</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {!shownPage &&
                        Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                            <TableRow key={index}>
                                {Array.from({ length: COLUMN_COUNT }, (_, cellIndex) => (
                                    <TableCell key={cellIndex}>
                                        <Skeleton height={14} width={cellIndex === 0 ? 140 : 64} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}

                    {shownPage?.items.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell className="students-table-name">{student.name}</TableCell>
                            <TableCell className="students-table-muted">{student.group}</TableCell>
                            <TableCell className="students-table-id">{student.idNumber}</TableCell>
                            <TableCell>
                                {student.hasBooked ? (
                                    <Badge variant="success">Booked</Badge>
                                ) : (
                                    <Badge variant="outline">Not booked</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}

                    {shownPage?.items.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={COLUMN_COUNT}>
                                {isPastLastPage ? (
                                    <EmptyState
                                        title="This page is past the last student"
                                        description="The list may have changed since this link was made."
                                        preview={{
                                            name: 'students',
                                            status: `page ${pageNumber}`,
                                            message: 'nothing here',
                                        }}
                                        actions={
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => goToPage(1)}
                                            >
                                                Go to first page
                                            </Button>
                                        }
                                    />
                                ) : hasFilters ? (
                                    <EmptyState
                                        title="No students match these filters"
                                        description="Try a different name, group or ID number, or clear the filters to see everyone."
                                        preview={{
                                            name: 'students',
                                            status: 'filtered',
                                            message: 'no matches',
                                        }}
                                        actions={
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={clearFilters}
                                            >
                                                Clear filters
                                            </Button>
                                        }
                                    />
                                ) : (
                                    <EmptyState
                                        title="No students yet"
                                        description="Import a CSV above. Students then appear here and in the picker on the booking page."
                                        preview={{
                                            name: 'students',
                                            status: '0 total',
                                            message: 'waiting for the first import',
                                        }}
                                    />
                                )}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <TablePagination
                range={shownPage && toPageRange(shownPage)}
                pageNumber={pageNumber}
                isBusy={isStale}
                loadingLabel="Loading students…"
                announcement={announcement.text}
                onPageChange={goToPage}
            />
        </div>
    );
}
