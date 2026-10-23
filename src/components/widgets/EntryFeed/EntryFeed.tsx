'use client';
import { useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { CheckIcon, TriangleAlertIcon } from 'lucide-react';
import './entryFeed.scss';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import type { GateEvent } from '@/types/admin';
import { formatDate } from '@/utils/dates';
import { mergeGateEvents } from '@/context/liveSlices';
import { DURATION, EASE_OUT } from '@/utils/motion';
import { pluralize } from '@/utils/text';

type FeedFilter = 'all' | 'issues';

const FILTER_OPTIONS: { value: FeedFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'issues', label: 'Issues' },
];

const VISIBLE_EVENT_LIMIT = 8;

function describeEvent(event: GateEvent): string {
    if (event.kind === 'alreadyCheckedIn') return `Scanned again · ${event.checkerName}`;

    return `${event.guestCount} ${pluralize(event.guestCount, 'guest')} · ${event.checkerName}`;
}

function announceNewEvents(events: GateEvent[], addedIds: string[]): string {
    const added = events.filter((event) => addedIds.includes(event.id));
    const checkIns = added.filter((event) => event.kind === 'checkedIn').length;
    const repeatScans = added.length - checkIns;
    const parts = [
        checkIns > 0 && `${checkIns} new ${pluralize(checkIns, 'check-in')}`,
        repeatScans > 0 && `${repeatScans} repeat ${pluralize(repeatScans, 'scan')}`,
    ];

    return parts.filter((part) => part !== false).join(', ');
}

export function EntryFeed({ events }: { events: GateEvent[] }) {
    const prefersReducedMotion = useReducedMotion();
    const [filter, setFilter] = useState<FeedFilter>('all');
    const [feed, setFeed] = useState({
        source: events,
        events,
        added: new Set<string>(),
        announcement: '',
    });

    if (feed.source !== events) {
        const merged = mergeGateEvents(feed.events, events);

        setFeed({
            source: events,
            events: merged.events,
            added: new Set(merged.added),
            announcement: announceNewEvents(merged.events, merged.added),
        });
    }

    const visibleEvents = feed.events
        .filter((event) => filter === 'all' || event.kind === 'alreadyCheckedIn')
        .slice(0, VISIBLE_EVENT_LIMIT);

    return (
        <div className="entry-feed">
            <div className="entry-feed-header">
                <div>
                    <h2 className="entry-feed-title">Gate activity</h2>
                    <p className="entry-feed-description">Latest scans from all checkers.</p>
                </div>

                <SegmentedControl
                    aria-label="Show scans"
                    options={FILTER_OPTIONS}
                    value={filter}
                    onValueChange={setFilter}
                />
            </div>

            <p className="visually-hidden" role="status">
                {feed.announcement}
            </p>

            <ol className="entry-feed-list">
                <AnimatePresence initial={false}>
                    {visibleEvents.map((event) => (
                        <m.li
                            key={event.id}
                            layout={prefersReducedMotion ? false : 'position'}
                            className="entry-feed-item"
                            data-kind={event.kind}
                            data-fresh={feed.added.has(event.id) || undefined}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: prefersReducedMotion ? 0 : DURATION.slow,
                                ease: EASE_OUT,
                            }}
                        >
                            <span className="entry-feed-icon" aria-hidden="true">
                                {event.kind === 'checkedIn' ? <CheckIcon /> : <TriangleAlertIcon />}
                            </span>
                            <span className="entry-feed-text">
                                <b className="entry-feed-student">{event.studentName}</b>
                                <small className="entry-feed-detail">
                                    <span className="visually-hidden">
                                        {event.kind === 'checkedIn'
                                            ? 'Checked in. '
                                            : 'Already checked in. '}
                                    </span>
                                    {describeEvent(event)}
                                </small>
                            </span>
                            <time
                                className="entry-feed-time"
                                dateTime={event.at}
                                suppressHydrationWarning
                            >
                                {formatDate(new Date(event.at), 'time')}
                            </time>
                        </m.li>
                    ))}
                </AnimatePresence>
            </ol>

            {visibleEvents.length === 0 &&
                (filter === 'all' ? (
                    <EmptyState
                        size="compact"
                        title="No scans yet"
                        description="Check-ins show up here live as checkers scan passes at the gate."
                        preview={{ name: 'gate', status: 'listening', message: 'no scans yet' }}
                    />
                ) : (
                    <EmptyState
                        size="compact"
                        title="No repeat scans"
                        description="Passes scanned a second time show up here so the gate can turn them away."
                        preview={{ name: 'gate', status: 'issues', message: 'all clear' }}
                    />
                ))}
        </div>
    );
}
