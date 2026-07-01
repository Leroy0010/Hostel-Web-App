import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, CalendarCheck, ChevronRight, DoorOpen } from 'lucide-react';

import { BookingStatusBadge } from './BookingStatusBadge';
import { PaymentCountdown } from './PaymentCountdown';
import { formatDate, semesterLabel } from '../utils/booking.utils';
import type { BookingSummaryDto } from '../types/booking.types';

interface BookingCardProps {
    booking: BookingSummaryDto;
}

/**
 * Summary card for a single booking in the student's booking history list.
 *
 * Displays:
 *  - Hostel and room number.
 *  - Academic year + semester.
 *  - Booking status badge.
 *  - Request date.
 *  - Live payment countdown (only for APPROVED bookings with a deadline).
 *  - Chevron CTA navigating to the full booking detail page.
 *
 * Uses Framer Motion lift-on-hover for tactile feedback.
 */
export function BookingCard({ booking }: BookingCardProps) {
    const navigate = useNavigate();
    const showCountdown =
        booking.status === 'APPROVED' && Boolean(booking.paymentExpiresAt);

    return (
        <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
        >
            <button
                type="button"
                onClick={() => navigate(`/bookings/${booking.id}`)}
                className="w-full text-left"
                aria-label={`View booking for Room ${booking.roomNumber} at ${booking.hostelName}`}
            >
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 transition-colors duration-200 hover:shadow-md active:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:active:bg-gray-900">
                    <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                            <Building2
                                className="h-5 w-5 text-gray-400 dark:text-gray-500"
                                aria-hidden="true"
                            />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1 space-y-2">
                            {/* Top row: hostel + status */}
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
                                        {booking.hostelName}
                                    </p>
                                    <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <DoorOpen
                                            className="h-3 w-3"
                                            aria-hidden="true"
                                        />
                                        Room {booking.roomNumber}
                                    </p>
                                </div>
                                <BookingStatusBadge status={booking.status} />
                            </div>

                            {/* Meta row: academic year + semester + date */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                    <CalendarCheck
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                    />
                                    {booking.academicYear} ·{' '}
                                    {semesterLabel(booking.semester)}
                                </span>
                                <span>
                                    Requested {formatDate(booking.requestedAt)}
                                </span>
                            </div>

                            {/* Payment countdown — only for APPROVED with deadline */}
                            {showCountdown && (
                                <PaymentCountdown
                                    deadlineIso={booking.paymentExpiresAt!}
                                    className="mt-1"
                                />
                            )}
                        </div>

                        {/* Chevron */}
                        <ChevronRight
                            className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-transform duration-150 group-hover:translate-x-0.5 dark:text-gray-700"
                            aria-hidden="true"
                        />
                    </div>
                </div>
            </button>
        </motion.div>
    );
}

// =============================================================================
// Skeleton variant
// =============================================================================

/**
 * Loading skeleton matching the {@link BookingCard} layout.
 */
export function BookingCardSkeleton() {
    return (
        <div
            className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
            aria-hidden="true"
        >
            <div className="flex items-start gap-3">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="flex-1 space-y-2.5">
                    <div className="flex justify-between gap-2">
                        <div className="h-4 w-40 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                        <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="h-3 w-56 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                </div>
            </div>
        </div>
    );
}
