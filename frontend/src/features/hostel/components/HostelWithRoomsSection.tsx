import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GenderPolicyBadge } from './GenderPolicyBadge';
import {
    RoomPreviewCard,
    RoomPreviewCardSkeleton,
} from '@/features/room/components/RoomPreviewCard';
import type { HostelSummaryDto } from '../types/hostel.types';
import type { RoomSummaryDto } from '@/features/room/types/room.types';

interface HostelWithRoomsSectionProps {
    hostel: HostelSummaryDto;
    /**
     * Room preview data for this hostel — up to 6 items.
     * Passed in from the parent page which uses {@code useRoomPreviews}
     * to batch-fetch all visible hostels in parallel (avoiding N+1 requests).
     */
    rooms: RoomSummaryDto[];
    /** True while the room preview fetch is still in flight. */
    isLoadingRooms: boolean;
}

/**
 * A single hostel section on the student hostels discovery page.
 *
 * Layout pattern (Netflix / Airbnb / Booking.com):
 * ┌──────────────────────────────────────────────────────────┐
 * │  Hostel name            Address              [View All →] │
 * │  [Gender badge]                                           │
 * ├──────────────────────────────────────────────────────────┤
 * │  ← [Room] [Room] [Room] [Room] [Room] [Room] [See All] → │
 * │       (horizontal CSS scroll snap track, no infinite scroll) │
 * └──────────────────────────────────────────────────────────┘
 *
 * UX decisions:
 * - Room count is **capped at 6** — no infinite horizontal scroll.
 * - CSS {@code snap-x snap-mandatory} gives native-app snappiness on touch.
 * - The "See All" card at the end of the track is a tappable CTA.
 * - {@code scrollbar-none} hides the scrollbar on all browsers.
 * - No gesture conflict with vertical page scroll because horizontal momentum
 *   is isolated to the inner track container.
 */
export function HostelWithRoomsSection({
    hostel,
    rooms,
    isLoadingRooms,
}: HostelWithRoomsSectionProps) {
    const navigate = useNavigate();

    const handleViewAll = () => navigate(`/hostels/${hostel.id}`);

    return (
        <section
            aria-labelledby={`hostel-heading-${hostel.id}`}
            className="border-b border-gray-100 pb-6 last:border-0 dark:border-gray-800"
        >
            {/* ── Hostel header row ─────────────────────────────────────── */}
            <div className="mb-3 flex items-start justify-between gap-3 px-1">
                <div className="min-w-0 space-y-1">
                    <h3
                        id={`hostel-heading-${hostel.id}`}
                        className="truncate text-lg font-bold text-gray-900 dark:text-gray-100"
                    >
                        {hostel.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <MapPin
                                className="h-3 w-3 shrink-0"
                                aria-hidden="true"
                            />
                            {hostel.address}
                        </p>
                        <GenderPolicyBadge policy={hostel.genderPolicy} />
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleViewAll}
                    className="shrink-0 gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    aria-label={`View all rooms at ${hostel.name}`}
                >
                    View All
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
            </div>

            {/* ── Horizontal room preview strip ─────────────────────────── */}
            {/*
             * scroll-smooth:    smooth programmatic scrolls
             * snap-x:           horizontal scroll snapping axis
             * snap-mandatory:   forces snap to a card boundary after each swipe
             * scrollbar-none:   hides scrollbar on all browsers (see globals.css)
             *
             * The pb-2 prevents card shadows from being clipped by overflow-hidden.
             */}
            <div className="relative">
                <div className="flex snap-x snap-mandatory scrollbar-none gap-4 overflow-x-auto scroll-smooth pt-1 pb-2">
                    {/* Loading skeletons */}
                    {isLoadingRooms &&
                        Array.from({ length: 4 }).map((_, i) => (
                            <RoomPreviewCardSkeleton key={i} />
                        ))}

                    {/* Room preview cards */}
                    {!isLoadingRooms &&
                        rooms.map((room) => (
                            <RoomPreviewCard
                                key={room.id}
                                room={room}
                                hostelId={hostel.id}
                            />
                        ))}

                    {/* End-of-track "See All" card — always rendered after rooms load */}
                    {!isLoadingRooms && (
                        <SeeAllCard
                            roomCount={rooms.length}
                            onClick={handleViewAll}
                        />
                    )}

                    {/* Empty state when hostel has no rooms yet */}
                    {!isLoadingRooms && rooms.length === 0 && (
                        <NoRoomsCard onClick={handleViewAll} />
                    )}
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================

/** "See All Rooms" end-of-track card with arrow CTA. */
function SeeAllCard({
    roomCount,
    onClick,
}: {
    roomCount: number;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="View all rooms"
            className="flex w-36 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800"
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
                <ArrowRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
            <span className="px-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                See all {roomCount > 0 ? `${roomCount}+` : ''} rooms
            </span>
        </button>
    );
}

/** Shown when a hostel has no rooms available yet. */
function NoRoomsCard({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="No rooms available, view hostel details"
            className="flex w-65 shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center dark:border-gray-700 dark:bg-gray-900"
        >
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No rooms available
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
                Tap to view hostel details
            </p>
        </button>
    );
}
