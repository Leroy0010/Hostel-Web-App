import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RoomStatusBadge } from './RoomStatusBadge';
import { RoomTypeBadge } from './RoomTypeBadge';
import { AmenityChip } from './AmenityChip';
import { bedsLabel, formatPrice, roomImageFallback } from '../utils/room.utils';
import type { RoomDto } from '../types/room.types';
import { Layers } from 'lucide-react';

interface DetailedRoomCardProps {
    room: RoomDto;
    hostelId: string;
}

/**
 * Full-detail room card for the hostel rooms list page ({@code /hostels/:id/rooms}).
 *
 * Layout:
 * - Cover image on the left (responsive: full-width on mobile, fixed 192px on sm+).
 * - Details column on the right: name, price, floor, type, status.
 * - Horizontal amenity scroll track with a right-side fade gradient to signal overflow.
 * - "View Details" CTA navigates to the room detail page.
 *
 * Framer Motion:
 * - Entrance fade-up animation with a small y offset.
 * - Respects {@code useReducedMotion}.
 */
export function DetailedRoomCard({ room, hostelId }: DetailedRoomCardProps) {
    const navigate = useNavigate();
    const shouldReduceMotion = useReducedMotion();

    return (
        <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md sm:flex-row dark:border-gray-800 dark:bg-gray-950"
        >
            {/* ── Cover image ────────────────────────────────────────────── */}
            <div className="relative h-44 w-full shrink-0 overflow-hidden bg-gray-100 sm:h-auto sm:w-48 dark:bg-gray-800">
                <img
                    src={room.imageUrl || roomImageFallback()}
                    alt={`Room ${room.roomNumber}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                            roomImageFallback();
                    }}
                />
            </div>

            {/* ── Details column ─────────────────────────────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4">
                {/* Header row */}
                <div>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h4 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">
                                Room {room.roomNumber}
                            </h4>
                            {room.floorNumber !== null && (
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <Layers
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                    />
                                    Floor {room.floorNumber}
                                </p>
                            )}
                        </div>
                        <span className="text-base font-bold text-gray-900 dark:text-white">
                            {formatPrice(room.pricePerSemester)}
                            <span className="ml-0.5 text-xs font-normal text-gray-400 dark:text-gray-500">
                                /sem
                            </span>
                        </span>
                    </div>

                    {/* Type + status badges */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <RoomTypeBadge type={room.roomType} />
                        <RoomStatusBadge status={room.status} />
                    </div>

                    {/* Horizontal amenities track with fade-right signal */}
                    {room.amenities && room.amenities.length > 0 && (
                        <div className="relative mt-3">
                            {/* Fading right edge — signals to user there's more content */}
                            <div
                                className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-linear-to-l from-white dark:from-gray-950"
                                aria-hidden="true"
                            />
                            <div className="flex scrollbar-none gap-1.5 overflow-x-auto pr-8 pb-1">
                                {room.amenities.map((a) => (
                                    <AmenityChip key={a.id} amenity={a} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer row — occupancy + CTA */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {bedsLabel(room.bedsAvailable)}
                    </span>
                    <Button
                        size="sm"
                        onClick={() =>
                            navigate(`/hostels/${hostelId}/rooms/${room.id}`)
                        }
                        className="bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                    >
                        View Details
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

// ---------------------------------------------------------------------------
// Skeleton variant
// ---------------------------------------------------------------------------

/**
 * Skeleton placeholder matching the {@link DetailedRoomCard} layout.
 */
export function DetailedRoomCardSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:flex-row dark:border-gray-800 dark:bg-gray-950">
            <div className="h-44 w-full animate-pulse bg-gray-100 sm:h-auto sm:w-48 dark:bg-gray-800" />
            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="space-y-2">
                    <div className="h-4 w-28 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    <div className="h-3 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    <div className="flex gap-2">
                        <div className="h-5 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                        <div className="h-5 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    </div>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                    <div className="h-3 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    <div className="h-8 w-24 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                </div>
            </div>
        </div>
    );
}
