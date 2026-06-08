import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    BedDouble,
    CalendarCheck,
    DoorOpen,
    Layers,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { AmenityChip } from '../components/AmenityChip';
import { RoomStatusBadge } from '../components/RoomStatusBadge';
import { RoomTypeBadge } from '../components/RoomTypeBadge';
import { useRoomDetail } from '../hooks/room.hooks';
import { bedsLabel, formatPrice, roomImageFallback } from '../utils/room.utils';

// =============================================================================
// Page component
// =============================================================================

/**
 * Student-facing full room detail page.
 *
 * Sections:
 *  1. Back navigation (returns to the parent hostel's room list).
 *  2. Hero cover image.
 *  3. Room identity — number, type badge, floor, status badge.
 *  4. Key stats row — capacity, beds available, price per semester.
 *  5. Amenities — horizontal scrollable chip list with fade-right signal.
 *  6. Book Now CTA (placeholder — wired to the booking feature when built).
 *
 * URL structure: {@code /hostels/:hostelId/rooms/:roomId}
 *
 * All three async states (loading, error, populated) are handled per §8 of agent2.md.
 */
export default function RoomDetailPage() {
    const { hostelId, roomId } = useParams<{
        hostelId: string;
        roomId: string;
    }>();
    const navigate = useNavigate();

    const { data: room, isLoading, isError, refetch } = useRoomDetail(roomId);

    const isAvailable =
        room?.status === 'AVAILABLE' && (room?.bedsAvailable ?? 0) > 0;

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return <RoomDetailSkeleton />;
    }

    // ── Error / not found ─────────────────────────────────────────────────────
    if (isError || !room) {
        return (
            <div className="space-y-4">
                <BackButton onClick={() => navigate(-1)} />
                <EmptyState
                    icon={<DoorOpen className="h-8 w-8 text-gray-400" />}
                    title="Room not found"
                    description="This room may no longer be available or the link is incorrect."
                    action={
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                        >
                            Try again
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto max-w-2xl space-y-6"
            >
                {/* ── Back navigation ─────────────────────────────────── */}
                <BackButton
                    onClick={() =>
                        navigate(`/hostels/${hostelId ?? room.hostelId}`)
                    }
                />

                {/* ── Hero image ───────────────────────────────────────── */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
                    <img
                        src={room.imageUrl || roomImageFallback()}
                        alt={`Room ${room.roomNumber}`}
                        className="aspect-video w-full object-cover"
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                                roomImageFallback();
                        }}
                    />
                </div>

                {/* ── Room identity ────────────────────────────────────── */}
                <div className="space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                Room {room.roomNumber}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {room.hostelName}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <RoomTypeBadge type={room.roomType} />
                            <RoomStatusBadge status={room.status} />
                        </div>
                    </div>

                    {/* Floor number */}
                    {room.floorNumber !== null && (
                        <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                            <Layers className="h-4 w-4" aria-hidden="true" />
                            Floor {room.floorNumber}
                        </p>
                    )}
                </div>

                {/* ── Key stats ────────────────────────────────────────── */}
                <div className="grid grid-cols-3 divide-x divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950">
                    <StatCell
                        icon={<BedDouble className="h-5 w-5" />}
                        label="Capacity"
                        value={`${room.capacity} ${room.capacity === 1 ? 'person' : 'people'}`}
                    />
                    <StatCell
                        icon={<DoorOpen className="h-5 w-5" />}
                        label="Available"
                        value={bedsLabel(room.bedsAvailable)}
                        highlight={room.bedsAvailable > 0}
                    />
                    <StatCell
                        icon={<CalendarCheck className="h-5 w-5" />}
                        label="Per semester"
                        value={formatPrice(room.pricePerSemester)}
                        highlight
                    />
                </div>

                {/* ── Amenities ────────────────────────────────────────── */}
                {room.amenities.length > 0 && (
                    <section
                        aria-labelledby="amenities-heading"
                        className="space-y-3"
                    >
                        <h2
                            id="amenities-heading"
                            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                        >
                            Amenities
                        </h2>

                        {/* Horizontal scroll with fade-right gradient signal */}
                        <div className="relative">
                            <div
                                className="pointer-events-none absolute top-0 right-0 h-full w-12 bg-linear-to-l from-gray-50 dark:from-gray-900"
                                aria-hidden="true"
                            />
                            <div className="flex scrollbar-none gap-2 overflow-x-auto pr-10 pb-1">
                                {room.amenities.map((amenity) => (
                                    <AmenityChip
                                        key={amenity.id}
                                        amenity={amenity}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* ── Booking CTA ──────────────────────────────────────── */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {formatPrice(room.pricePerSemester)}
                                <span className="ml-1 text-base font-normal text-gray-400 dark:text-gray-500">
                                    / semester
                                </span>
                            </p>
                            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                {bedsLabel(room.bedsAvailable)}
                            </p>
                        </div>

                        {/*
                         * Book Now — disabled when the room is unavailable.
                         * Wire onClick to the booking flow when the booking
                         * feature is implemented.
                         */}
                        <Button
                            size="lg"
                            disabled={!isAvailable}
                            onClick={() => {
                                // TODO: navigate to booking creation when the booking
                                // feature is implemented:
                                // navigate(`/bookings/new?roomId=${room.id}`);
                            }}
                            className="w-full bg-gray-900 text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                            aria-disabled={!isAvailable}
                        >
                            {isAvailable ? 'Book Now' : 'Not Available'}
                        </Button>
                    </div>

                    {!isAvailable && (
                        <p className="mt-3 text-xs text-gray-400 dark:text-gray-600">
                            This room is currently{' '}
                            {room.status === 'FULLY_OCCUPIED'
                                ? 'fully occupied'
                                : room.status === 'UNDER_MAINTENANCE'
                                  ? 'under maintenance'
                                  : 'unavailable'}{' '}
                            and cannot be booked at this time.
                        </p>
                    )}
                </div>
            </motion.div>
        </>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================

/** Back navigation button — extracted to avoid repetition in error/loading branches. */
function BackButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className="gap-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
        </Button>
    );
}

/**
 * A single stat cell in the three-column stats row.
 *
 * @param highlight - When true, renders the value in stronger text.
 */
function StatCell({
    icon,
    label,
    value,
    highlight = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex flex-col items-center gap-1.5 px-4 py-4">
            <span
                className="text-gray-400 dark:text-gray-500"
                aria-hidden="true"
            >
                {icon}
            </span>
            <span className="text-[10px] font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                {label}
            </span>
            <span
                className={`text-center text-sm font-semibold ${
                    highlight
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-600 dark:text-gray-400'
                }`}
            >
                {value}
            </span>
        </div>
    );
}

/** Full-page loading skeleton matching the RoomDetailPage layout. */
function RoomDetailSkeleton() {
    return (
        <div
            className="mx-auto max-w-2xl space-y-6"
            aria-hidden="true"
            aria-label="Loading room details"
        >
            <div className="h-8 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
            <div className="aspect-video w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="space-y-2">
                <div className="h-7 w-40 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-32 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="h-24 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-28 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
    );
}
