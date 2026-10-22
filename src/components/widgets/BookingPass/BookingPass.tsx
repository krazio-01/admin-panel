'use client';
import { m } from 'motion/react';
import { CheckIcon, MailIcon } from 'lucide-react';
import './bookingPass.scss';
import type { BookingConfirmation } from '@/services/server/bookings';
import type { StudentOption } from '@/services/server/students';
import { formatStudentGroupAndId } from '@/utils/booking-form';
import { DURATION, EASE_OUT, STAGGER_INTERVAL } from '@/utils/motion';

export function BookingPass({
    confirmation,
    student,
}: {
    confirmation: BookingConfirmation;
    student: StudentOption | null;
}) {
    return (
        <div className="booking-pass" role="status">
            <m.span
                className="booking-pass-check"
                aria-hidden="true"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            >
                <CheckIcon />
            </m.span>

            <div>
                <h3 className="booking-pass-title">Your seats are booked</h3>
                {student && (
                    <p className="booking-pass-student">
                        {student.name}
                        <span className="booking-pass-meta">
                            {formatStudentGroupAndId(student)}
                        </span>
                    </p>
                )}
            </div>

            <div className="booking-pass-seats">
                <p className="booking-pass-label">
                    {confirmation.seats.length === 1 ? 'Seat' : 'Seats'}
                </p>
                <ul className="booking-pass-chips">
                    {confirmation.seats.map((seat, index) => (
                        <m.li
                            key={seat}
                            className="booking-pass-chip"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: DURATION.base,
                                ease: EASE_OUT,
                                delay: 0.15 + index * STAGGER_INTERVAL,
                            }}
                        >
                            {seat}
                        </m.li>
                    ))}
                </ul>
            </div>

            <p className="booking-pass-email">
                <MailIcon aria-hidden="true" />
                <span>
                    Your QR pass is on its way to{' '}
                    <strong className="booking-pass-address">
                        {confirmation.primaryEmailMasked}
                    </strong>
                    . Show it at the gate; it admits your whole party once.
                </span>
            </p>
        </div>
    );
}
