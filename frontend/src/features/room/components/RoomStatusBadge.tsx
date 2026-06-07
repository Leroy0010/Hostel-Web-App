import { cn } from '@/lib/utils';
import { roomStatusColors, roomStatusLabel } from '../utils/room.utils';
import type { RoomStatus } from '../types/room.types';

interface RoomStatusBadgeProps {
    status: RoomStatus;
    className?: string;
}

/**
 * Displays a room's operational status as a small color-coded badge.
 *
 * - Available       → green with pulsing dot
 * - Fully Occupied  → red with static dot
 * - Under Maintenance → amber with static dot
 * - Reserved        → blue with static dot
 */
export function RoomStatusBadge({ status, className }: RoomStatusBadgeProps) {
    const colors = roomStatusColors(status);

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
                {status === 'AVAILABLE' && (
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
            {roomStatusLabel(status)}
        </span>
    );
}
