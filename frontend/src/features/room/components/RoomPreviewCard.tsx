import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { AvailablePeriodsBadge } from './AvailablePeriodsBadge';
import { roomImageFallback, formatPrice, roomTypeLabel } from '../utils/room.utils';
import type { RoomDisplayDto } from '@/features/hostel/types/hostel.types';

interface RoomPreviewCardProps {
    /** Room data from the sections endpoint (includes availablePeriods). */
    room: RoomDisplayDto;
    /** UUID of the parent hostel — used to build the room detail link. */
    hostelId: string;
}

/**
 * Compact room preview card used in the horizontal CSS-snap strip
 * on the student hostel discovery page.
 *
 * Layout:
 * ┌──────────────────────────┐
 * │   Room image (aspect)    │
 * ├──────────────────────────┤
 * │ Room #  ·  Type          │
 * │ ₵ Price / semester       │
 * │ [availability badge]     │
 * └──────────────────────────┘
 *
 * Uses {@link RoomDisplayDto} (returned by the sections endpoint) rather
 * than the old {@link RoomSummaryDto} so that {@code availablePeriods} is
 * always available without an extra fetch.
 *
 * @example
 * ```tsx
 * <RoomPreviewCard room={room} hostelId={hostel.id} />
 * ```
 */
export function RoomPreviewCard({ room, hostelId }: RoomPreviewCardProps) {
    const navigate = useNavigate();

    return (
        <motion.button
            type="button"
            onClick={() => navigate(`/hostels/${hostelId}/rooms/${room.id}`)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            aria-label={`View room ${room.roomNumber}`}
            className="w-56 shrink-0 snap-start overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none dark:border-gray-800 dark:bg-gray-950 dark:hover:shadow-gray-900/50"
        >
            {/* Room image */}
            <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                    src={room.imageUrl || roomImageFallback()}
                    alt={`Room ${room.roomNumber}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = roomImageFallback();
                    }}
                />
                {/* Floor number badge */}
                <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-md bg-black/50 px-1.5 py-0.5 backdrop-blur-sm">
                    <Layers className="h-2.5 w-2.5 text-white/80" aria-hidden="true" />
                    <span className="text-[10px] font-medium text-white">
                        Fl. {room.floorNumber}
                    </span>
                </div>
            </div>

            {/* Card body */}
            <div className="space-y-1.5 p-3">
                {/* Room number + type */}
                <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Room {room.roomNumber}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {roomTypeLabel(room.roomType)} · Cap. {room.capacity}
                    </p>
                </div>

                {/* Price */}
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatPrice(room.pricePerSemester)}
                    <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                        / semester
                    </span>
                </p>

                {/* Available periods — compact mode */}
                
                <AvailablePeriodsBadge periods={room.availablePeriods} compact />
            </div>
        </motion.button>
    );
}

// =============================================================================
// Skeleton
// =============================================================================

/**
 * Animated skeleton matching the {@link RoomPreviewCard} layout.
 * Shown while the sections endpoint is loading.
 */
export function RoomPreviewCardSkeleton() {
    return (
        <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-56 shrink-0 snap-start overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
            aria-hidden="true"
        >
            <div className="aspect-video bg-gray-100 dark:bg-gray-800" />
            <div className="space-y-2 p-3">
                <div className="h-3.5 w-24 rounded-md bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-16 rounded-md bg-gray-100 dark:bg-gray-800" />
                <div className="h-3.5 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-28 rounded-md bg-gray-100 dark:bg-gray-800" />
            </div>
        </motion.div>
    );
}