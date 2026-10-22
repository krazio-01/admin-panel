'use client';
import { useMemo, useRef, useState } from 'react';
import './seatMap.scss';
import { AuditoriumFallback } from '@/components/scenes/AuditoriumFallback/AuditoriumFallback';
import { LazyAuditorium, useSceneGate } from '@/components/scenes/LazyScenes';
import { bookedSeatStates } from '@/components/scenes/seatLayout';
import { useAppContext } from '@/context/appContext';
import { bookedSeatCount } from '@/utils/booking-form';

export function OwnSeatsLegendItem() {
    const { ownSeats } = useAppContext('booking');

    if (!ownSeats?.length) return null;

    return (
        <li className="seat-map-own-seats">
            <i className="seat-map-swatch" data-state="yours" />
            Your seats
        </li>
    );
}

export function SeatMapScene({
    rows,
    seatsPerRow,
    eventName,
}: {
    rows: number;
    seatsPerRow: number;
    eventName: string;
}) {
    const booking = useAppContext('booking');
    const { ownSeats } = booking;
    const sceneRef = useRef<HTMLDivElement>(null);
    const [isSceneReady, setIsSceneReady] = useState(false);

    const shouldLoadScene = useSceneGate(sceneRef);

    const seatStates = useMemo(
        () => bookedSeatStates(bookedSeatCount(booking), rows * seatsPerRow, seatsPerRow),
        [booking, rows, seatsPerRow],
    );

    return (
        <div
            ref={sceneRef}
            className="seat-map-scene"
            data-scene="auditorium"
            data-scene-ready={isSceneReady || undefined}
        >
            <AuditoriumFallback
                rows={rows}
                seatsPerRow={seatsPerRow}
                seatStates={seatStates}
                highlightedSeatLabels={ownSeats}
                eventName={eventName}
            />

            {shouldLoadScene && (
                <LazyAuditorium
                    rows={rows}
                    seatsPerRow={seatsPerRow}
                    seatStates={seatStates}
                    highlightedSeatLabels={ownSeats}
                    eventName={eventName}
                    startsAtRest
                    onFirstFrame={() => setIsSceneReady(true)}
                />
            )}
        </div>
    );
}
