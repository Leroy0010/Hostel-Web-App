import { cn } from '@/lib/utils';
import { hostelStatusColors } from '../utils/hostel.utils';

interface HostelStatusBadgeProps {
    isActive: boolean;
    className?: string;
}

/**
 * Renders a small status badge indicating whether a hostel is active or inactive.
 *
 * - Active   → green badge with pulsing dot
 * - Inactive → gray badge with static dot
 *
 * Used in admin tables, hostel cards, and the detail view header.
 */
export function HostelStatusBadge({
    isActive,
    className,
}: HostelStatusBadgeProps) {
    const colors = hostelStatusColors(isActive);

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
            <span className="relative flex h-1.5 w-1.5">
                {isActive && (
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
            {isActive ? 'Active' : 'Inactive'}
        </span>
    );
}
