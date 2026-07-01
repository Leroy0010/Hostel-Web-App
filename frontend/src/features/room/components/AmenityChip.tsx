import { cn } from '@/lib/utils';
import type { AmenityDto } from '../types/room.types';

interface AmenityChipProps {
    amenity: AmenityDto;
    className?: string;
}

/**
 * A small pill-shaped chip representing a single room amenity.
 *
 * Renders an optional icon image alongside the amenity label.
 * Designed for use inside the horizontal scrolling amenities track
 * on the {@link DetailedRoomCard} and {@link RoomDetailPage}.
 *
 * @example
 * ```tsx
 * <AmenityChip amenity={{ id: '1', amenity: 'Air Conditioning', imageUrl: null }} />
 * ```
 */
export function AmenityChip({ amenity, className }: AmenityChipProps) {
    return (
        <div
            className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 dark:border-gray-800 dark:bg-gray-900',
                className
            )}
        >
            {/* Optional amenity icon */}
            {amenity.imageUrl && (
                <img
                    src={amenity.imageUrl}
                    alt=""
                    className="h-3.5 w-3.5 object-contain"
                    aria-hidden="true"
                    onError={(e) => {
                        // Hide broken icon images gracefully
                        (e.currentTarget as HTMLImageElement).style.display =
                            'none';
                    }}
                />
            )}
            <span className="text-xs font-medium text-gray-600 md:text-base dark:text-gray-300">
                {amenity.amenity}
            </span>
        </div>
    );
}
