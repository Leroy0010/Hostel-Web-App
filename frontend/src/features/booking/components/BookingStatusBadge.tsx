import { cn } from '@/lib/utils';
import { statusColors, statusLabel } from '../utils/booking.utils';
import type { BookingStatus } from '../types/booking.types';

interface BookingStatusBadgeProps {
    status: BookingStatus;
    className?: string;
}

/**
 * Color-coded badge for a booking's lifecycle status.
 *
 * Active states (PENDING, APPROVED, CHECKED_IN) show a pulsing dot.
 * Terminal states (REJECTED, CANCELLED, EXPIRED, CHECKED_OUT) show a static dot.
 *
 * Color mapping:
 *  - PENDING      → amber (awaiting decision)
 *  - APPROVED     → blue (awaiting payment / check-in)
 *  - CHECKED_IN   → green (resident)
 *  - CHECKED_OUT  → gray (complete)
 *  - REJECTED / CANCELLED / EXPIRED → red
 *  - WAITLISTED   → purple
 */
export function BookingStatusBadge({
    status,
    className,
}: BookingStatusBadgeProps) {
    const colors = statusColors(status);
    const isPulsing = ['PENDING', 'APPROVED', 'CHECKED_IN'].includes(status);

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                colors.bg,
                colors.text,
                colors.border,
                className
            )}
        >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
                {isPulsing && (
                    <span
                        className={cn(
                            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                            colors.dot
                        )}
                        aria-hidden="true"
                    />
                )}
                <span
                    className={cn(
                        'relative inline-flex h-1.5 w-1.5 rounded-full',
                        colors.dot
                    )}
                />
            </span>
            {statusLabel(status)}
        </span>
    );
}
