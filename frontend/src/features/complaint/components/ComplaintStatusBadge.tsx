import { cn } from '@/lib/utils';
import {
    complaintStatusColors,
    complaintStatusLabel,
} from '../utils/complaint.utils';
import type { ComplaintStatus } from '../types/complaint.types';

interface ComplaintStatusBadgeProps {
    status: ComplaintStatus;
    className?: string;
}

/**
 * Color-coded badge for a complaint's lifecycle status.
 *
 * Active states (OPEN, IN_PROGRESS) show a pulsing dot.
 * Terminal states (RESOLVED, CLOSED) show a static dot.
 *
 * Color mapping:
 *  - OPEN        → red (needs attention)
 *  - IN_PROGRESS → amber (being worked on)
 *  - RESOLVED    → green (fixed)
 *  - CLOSED      → gray (archived)
 */
export function ComplaintStatusBadge({
    status,
    className,
}: ComplaintStatusBadgeProps) {
    const colors = complaintStatusColors(status);
    const isPulsing = status === 'OPEN' || status === 'IN_PROGRESS';

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
            {complaintStatusLabel(status)}
        </span>
    );
}
