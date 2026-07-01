import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPastDeadline, timeRemaining } from '../utils/booking.utils';

interface PaymentCountdownProps {
    /** ISO 8601 deadline string from {@code BookingDto.paymentExpiresAt}. */
    deadlineIso: string;
    className?: string;
}

/**
 * Live payment deadline countdown for APPROVED bookings.
 *
 * Displays the time remaining until the payment reference must be submitted.
 * Ticks every second via a {@code setInterval} — clears on unmount.
 *
 * Visual urgency states:
 *  - Normal (> 1 hour)  → gray clock
 *  - Urgent (< 1 hour)  → amber text + animated pulse
 *  - Expired            → red, bold "Payment window expired"
 *
 * @example
 * ```tsx
 * {booking.status === 'APPROVED' && booking.paymentExpiresAt && (
 *   <PaymentCountdown deadlineIso={booking.paymentExpiresAt} />
 * )}
 * ```
 */
export function PaymentCountdown({
    deadlineIso,
    className,
}: PaymentCountdownProps) {
    const [remaining, setRemaining] = useState(() =>
        timeRemaining(deadlineIso)
    );
    const [isExpired, setIsExpired] = useState(() =>
        isPastDeadline(deadlineIso)
    );

    const [now, setNow] = useState(() => Date.now());
    

    // Recalculate every second
    useEffect(() => {
        const tick = () => {
            setNow(Date.now());
            setRemaining(timeRemaining(deadlineIso));
            setIsExpired(isPastDeadline(deadlineIso));
        };

        const intervalId = window.setInterval(tick, 1000);
        return () => clearInterval(intervalId);
    }, [deadlineIso]);

    // Determine urgency: < 1 hour remaining
    const deadlineMs = new Date(deadlineIso).getTime();
    const diffMs = deadlineMs - now;
    const isUrgent = !isExpired && diffMs > 0 && diffMs < 60 * 60 * 1000;

    if (isExpired) {
        return (
            <div
                className={cn(
                    'flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800/50 dark:bg-red-950/30',
                    className
                )}
                role="status"
                aria-live="polite"
            >
                <Clock
                    className="h-4 w-4 text-red-500 dark:text-red-400"
                    aria-hidden="true"
                />
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    Payment window expired
                </span>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-2 transition-colors duration-200',
                isUrgent
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50',
                className
            )}
            role="status"
            aria-live="polite"
            aria-label={`Payment deadline: ${remaining} remaining`}
        >
            <Clock
                className={cn(
                    'h-4 w-4 shrink-0',
                    isUrgent
                        ? 'text-amber-500 dark:text-amber-400'
                        : 'text-gray-400 dark:text-gray-500'
                )}
                aria-hidden="true"
            />
            <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                    Payment deadline
                </p>
                <p
                    className={cn(
                        'font-mono text-sm font-bold',
                        isUrgent
                            ? 'text-amber-600 dark:text-amber-300'
                            : 'text-gray-800 dark:text-gray-200'
                    )}
                >
                    {remaining}
                </p>
            </div>
        </div>
    );
}
