import { useNavigate } from 'react-router-dom';
import { RoomTypeBadge } from './RoomTypeBadge';
import { bedsLabel, formatPrice, roomImageFallback } from '../utils/room.utils';
import type { RoomSummaryDto } from '../types/room.types';
import { cn } from '@/lib/utils';

interface RoomPreviewCardProps {
    room: RoomSummaryDto;
    hostelId: string;
}

/**
 * Compact room card designed for the **horizontal scroll preview strip**.
 *
 * Width is fixed at 260px and uses {@code snap-start} so CSS scroll snapping
 * locks each card neatly into view on touch devices, preventing gesture conflicts
 * with the outer vertical page scroll (Netflix / Airbnb pattern).
 *
 * Tapping the card navigates to the full room detail page.
 *
 * @param room     - Lightweight {@link RoomSummaryDto} — no amenity data needed here.
 * @param hostelId - UUID of the parent hostel, used to build the detail path.
 */
export function RoomPreviewCard({ room, hostelId }: RoomPreviewCardProps) {
    const navigate = useNavigate();
    const isUnavailable = room.status !== 'AVAILABLE';

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/hostels/${hostelId}/rooms/${room.id}`)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/hostels/${hostelId}/rooms/${room.id}`);
                }
            }}
            aria-label={`View Room ${room.roomNumber} — ${formatPrice(room.pricePerSemester)} per semester`}
            className={cn(
                // Fixed width + snap behaviour
                'w-65 shrink-0 snap-start',
                // Card shell
                'overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm',
                'dark:border-gray-800 dark:bg-gray-950',
                // Interaction
                'cursor-pointer outline-none',
                'transition-transform duration-200 active:scale-[0.98]',
                'focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2',
                isUnavailable && 'opacity-70'
            )}
        >
            {/* Cover image */}
            <div className="relative h-32 overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                    src={room.imageUrl || roomImageFallback()}
                    alt={`Room ${room.roomNumber}`}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                            roomImageFallback();
                    }}
                />
                {/* Unavailable overlay */}
                {isUnavailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white uppercase">
                            {room.status === 'FULLY_OCCUPIED'
                                ? 'Full'
                                : room.status === 'UNDER_MAINTENANCE'
                                  ? 'Maintenance'
                                  : 'Reserved'}
                        </span>
                    </div>
                )}
            </div>

            {/* Card body */}
            <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Room {room.roomNumber}
                    </span>
                    <RoomTypeBadge type={room.roomType} />
                </div>

                <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {bedsLabel(room.bedsAvailable)}
                    </p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatPrice(room.pricePerSemester)}
                        <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500">
                            /sem
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Skeleton variant — used while room previews are loading
// ---------------------------------------------------------------------------

/**
 * Skeleton placeholder matching {@link RoomPreviewCard} dimensions.
 * Animated pulse while room data is in flight.
 */
export function RoomPreviewCardSkeleton() {
    return (
        <div className="w-65 shrink-0 snap-start overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="h-32 animate-pulse bg-gray-100 dark:bg-gray-800" />
            <div className="space-y-2.5 p-3">
                <div className="flex justify-between">
                    <div className="h-3.5 w-24 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    <div className="h-3.5 w-14 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="flex justify-between">
                    <div className="h-3 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    <div className="h-3 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                </div>
            </div>
        </div>
    );
}
