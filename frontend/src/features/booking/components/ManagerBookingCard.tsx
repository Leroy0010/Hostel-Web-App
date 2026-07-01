import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, ChevronRight, DoorOpen, User } from 'lucide-react';

import { BookingStatusBadge } from './BookingStatusBadge';
import { formatDate, semesterLabel } from '../utils/booking.utils';
import type { BookingSummaryDto } from '../types/booking.types';

interface ManagerBookingCardProps {
    booking: BookingSummaryDto;
}

export function ManagerBookingCard({ booking }: ManagerBookingCardProps) {
    const navigate = useNavigate();

    return (
        <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/bookings/${booking.id}`)}
            className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-4 text-left transition-shadow duration-200 hover:shadow-md active:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:active:bg-gray-900"
        >
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="truncate">
                                    {booking.studentName}
                                </span>
                            </p>

                            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                <DoorOpen className="h-3.5 w-3.5" />
                                Room {booking.roomNumber}
                            </p>
                        </div>

                        <BookingStatusBadge status={booking.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                            <CalendarCheck className="h-3 w-3" />
                            {booking.academicYear}
                        </span>

                        <span>{semesterLabel(booking.semester)}</span>

                        <span>Requested {formatDate(booking.requestedAt)}</span>
                    </div>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-700" />
            </div>
        </motion.button>
    );
}
