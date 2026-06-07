import { cn } from '@/lib/utils';
import { roomTypeColors, roomTypeLabel } from '../utils/room.utils';
import type { RoomType } from '../types/room.types';

interface RoomTypeBadgeProps {
    type: RoomType;
    className?: string;
}

/**
 * Compact color-coded badge indicating a room's type (Single, Double, etc.).
 * Uses the room type color palette from {@link roomTypeColors}.
 */
export function RoomTypeBadge({ type, className }: RoomTypeBadgeProps) {
    const colors = roomTypeColors(type);

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                colors.bg,
                colors.text,
                colors.border,
                className
            )}
        >
            {roomTypeLabel(type)}
        </span>
    );
}