'use client';
import { CountUp } from '@/components/ui/Animations/ClientAnimations';
import { useAppContext } from '@/context/appContext';
import { bookedSeatCount } from '@/utils/booking-form';

export function SeatsLeft({ totalSeats }: { totalSeats: number }) {
    const booking = useAppContext('booking');

    const seatsLeft = Math.max(0, totalSeats - bookedSeatCount(booking));

    return (
        <span data-stat="seats-left" data-value={seatsLeft}>
            <CountUp value={seatsLeft} /> / {totalSeats}
        </span>
    );
}
