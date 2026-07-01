import { Building2, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BookingStatusBadge } from './BookingStatusBadge';
import { semesterLabel } from '../utils/booking.utils';
import type { BookingDto } from '../types/booking.types';

interface BookingDetailHeaderProps {
    booking: BookingDto;
    onLeaveReview?: () => void;
}

export function BookingDetailHeader({
    booking,
    onLeaveReview,
}: BookingDetailHeaderProps) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors duration-200 dark:border-gray-800 dark:bg-gray-950">
            <div className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 pr-24 text-xs font-semibold tracking-wide text-gray-400 uppercase sm:pr-0 dark:text-gray-500">
                            <Building2 className="h-3.5 w-3.5" />
                            {booking.room.hostelName}
                        </div>

                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            Room {booking.room.roomNumber}
                        </h1>

                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {booking.academicYear} ·{' '}
                            {semesterLabel(booking.semester)}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
                        <div className="absolute top-3 right-1 sm:relative sm:top-auto sm:right-auto">
                            <BookingStatusBadge status={booking.status} />
                        </div>

                        {booking.status === 'CHECKED_IN' && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-full gap-2 px-3 text-xs sm:h-7 sm:w-auto sm:px-2"
                                onClick={onLeaveReview}
                            >
                                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                Leave Review
                            </Button>
                        )}
                    </div>
                </div>

                {booking.isWaitlistDraft && (
                    <p className="mt-2 text-xs font-medium text-purple-600 dark:text-purple-400">
                        Promoted from waitlist
                    </p>
                )}
            </div>
        </div>
    );
}
