'use client';
import { Suspense, use, useState } from 'react';
import './aadhaarReveal.scss';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/Dialog/Dialog';
import { Alert, AlertDescription } from '@/components/ui/Alert/Alert';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import { AADHAAR_GROUP_SIZE } from '@/types/booking';
import { groupCharacters } from '@/utils/text';

type RevealResult =
    | { status: 'loaded'; guests: { name: string; aadhaar: string | null }[] }
    | { status: 'failed'; message: string };

type RevealTarget = { studentName: string; guestCount: number; result: Promise<RevealResult> };

function GuestSkeletons({ count }: { count: number }) {
    return (
        <ul className="aadhaar-reveal-list" aria-busy="true">
            {Array.from({ length: count }, (_, index) => (
                <li key={index} className="aadhaar-reveal-guest">
                    <Skeleton width="40%" height={14} />
                    <Skeleton width={128} height={14} />
                </li>
            ))}
        </ul>
    );
}

function RevealedGuests({ result }: { result: Promise<RevealResult> }) {
    const reveal = use(result);

    if (reveal.status === 'failed') {
        return (
            <Alert variant="destructive">
                <AlertDescription>{reveal.message}</AlertDescription>
            </Alert>
        );
    }

    return (
        <ul className="aadhaar-reveal-list">
            {reveal.guests.map((guest, index) => (
                <li key={index} className="aadhaar-reveal-guest">
                    <span className="aadhaar-reveal-name">{guest.name}</span>
                    {guest.aadhaar ? (
                        <span className="aadhaar-reveal-number">
                            {groupCharacters(guest.aadhaar, AADHAAR_GROUP_SIZE)}
                        </span>
                    ) : (
                        <span className="aadhaar-reveal-purged">Removed</span>
                    )}
                </li>
            ))}
        </ul>
    );
}

export function AadhaarReveal({
    target,
    onClose,
}: {
    target: RevealTarget | null;
    onClose: () => void;
}) {
    const [shownTarget, setShownTarget] = useState(target);

    if (target && target !== shownTarget) setShownTarget(target);

    return (
        <Dialog
            open={target !== null}
            onOpenChange={(isOpen) => !isOpen && onClose()}
            onOpenChangeComplete={(isOpen) => !isOpen && setShownTarget(null)}
        >
            <DialogContent className="aadhaar-reveal">
                <DialogHeader>
                    <DialogTitle>Aadhaar numbers</DialogTitle>
                    <DialogDescription>
                        {shownTarget?.studentName}. This reveal is recorded in the audit log.
                    </DialogDescription>
                </DialogHeader>

                {shownTarget && (
                    <Suspense fallback={<GuestSkeletons count={shownTarget.guestCount} />}>
                        <RevealedGuests result={shownTarget.result} />
                    </Suspense>
                )}

                <DialogFooter showCloseButton />
            </DialogContent>
        </Dialog>
    );
}

export type { RevealResult, RevealTarget };
