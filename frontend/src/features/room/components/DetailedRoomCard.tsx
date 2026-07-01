import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Layers, ChevronRight } from 'lucide-react';
import { AvailablePeriodsBadge } from './AvailablePeriodsBadge';
import { roomImageFallback, formatPrice, roomTypeLabel } from '../utils/room.utils';
import type { RoomDisplayDto } from '@/features/hostel/types/hostel.types';

interface DetailedRoomCardProps {
    /** Room data from the detail endpoint (includes availablePeriods). */
    room: RoomDisplayDto;
    /** UUID of the parent hostel — used to build the room detail navigation link. */
    hostelId: string;
}

/**
 * Full-width room card used in the vertical room list on the hostel detail page.
 *
 * Layout:
 * ┌────────────────────────────────────────────────────┐
 * │ [Thumbnail] │ Room #  Type          Price         │ ›
 * │             │ Floor · Capacity                    │
 * │             │ [Available periods badges]           │
 * └────────────────────────────────────────────────────┘
 *
 * The card links to the room detail page on click. The chevron icon gives
 * a clear affordance that the card is tappable.
 *
 * Uses {@link RoomDisplayDto} — the unified shape returned by both the hostel
 * detail endpoint and the sections endpoint — so this component works across
 * both contexts without type adapters.
 *
 * @example
 * ```tsx
 * {rooms.map(room => (
 *   <DetailedRoomCard key={room.id} room={room} hostelId={hostelId} />
 * ))}
 * ```
 */
export function DetailedRoomCard({ room, hostelId }: DetailedRoomCardProps) {
    const navigate = useNavigate();

    return (
        <motion.div
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
        >
            <button
                type="button"
                onClick={() =>
                    navigate(`/hostels/${hostelId}/rooms/${room.id}`)
                }
                className="group flex w-full items-start gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 text-left transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none dark:border-gray-800 dark:bg-gray-950"
                aria-label={`View details for room ${room.roomNumber}`}
            >
                {/* Thumbnail */}
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    <img
                        src={room.imageUrl || roomImageFallback()}
                        alt={`Room ${room.roomNumber}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                                roomImageFallback();
                        }}
                    />
                    {/* Floor badge overlaid on the image */}
                    <div className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/50 px-1 py-0.5 backdrop-blur-sm">
                        <Layers
                            className="h-2.5 w-2.5 text-white/80"
                            aria-hidden="true"
                        />
                        <span className="text-[9px] font-medium text-white">
                            Fl. {room.floorNumber}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Header row: room number + price */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Room {room.roomNumber}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {roomTypeLabel(room.roomType)}
                            </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-gray-900 dark:text-gray-100">
                            {formatPrice(room.pricePerSemester)}
                            <span className="ml-0.5 text-xs font-normal text-gray-400 dark:text-gray-500">
                                /sem
                            </span>
                        </p>
                    </div>

                    {/* Capacity row */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Users
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                        />
                        <span>Capacity: {room.capacity}</span>
                    </div>

                    {/* Available periods — compact badge display */}
                    <AvailablePeriodsBadge periods={room.availablePeriods} compact />
                </div>

                {/* Chevron affordance */}
                <ChevronRight
                    className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400"
                    aria-hidden="true"
                />
            </button>
        </motion.div>
    );
}

// =============================================================================
// Skeleton
// =============================================================================

/**
 * Animated skeleton matching the {@link DetailedRoomCard} layout.
 * Shown while the hostel detail endpoint is loading.
 */
export function DetailedRoomCardSkeleton() {
    return (
        <div
            className="flex items-start gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950"
            aria-hidden="true"
        >
            {/* Thumbnail skeleton */}
            <div className="h-24 w-32 shrink-0 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />

            {/* Content skeleton */}
            <div className="flex-1 space-y-2 pt-1">
                <div className="flex justify-between">
                    <div className="space-y-1">
                        <div className="h-4 w-24 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="h-4 w-20 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="h-3 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                <div className="flex gap-1.5">
                    <div className="h-5 w-28 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                    <div className="h-5 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                </div>
            </div>
        </div>
    );
}