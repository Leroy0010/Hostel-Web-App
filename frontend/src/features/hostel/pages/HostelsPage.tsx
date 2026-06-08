import { motion } from 'framer-motion';
import { Building2, Search } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import { HostelFilters } from '../components/HostelFilters';
import { HostelWithRoomsSection } from '../components/HostelWithRoomsSection';
import { useHostelFilters } from '../hooks/useHostelFilters';
import { useActiveHostels } from '../hooks/hostel.hooks';
import { useRoomPreviews } from '@/features/room/hooks/room.hooks';
import { transition } from '@/features/auth/utils/transition';

// =============================================================================
// Page-level animation variants
// =============================================================================

const pageVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition,
    },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Student-facing hostel discovery page.
 *
 * Layout pattern (Netflix / Airbnb / Booking.com):
 *  - A vertical list of hostel sections, each containing a horizontal
 *    CSS snap-scrolling room preview strip (max 6 rooms per strip).
 *  - Filters (search, gender policy) are synced to URL search params via
 *    {@link useHostelFilters} so they survive refresh and are shareable.
 *  - Room previews for all visible hostels are fetched in **parallel** via
 *    {@link useRoomPreviews} — using {@code useQueries} internally — to
 *    avoid the N+1 request anti-pattern.
 *
 * States handled:
 *  - Loading: skeleton sections shown during initial fetch.
 *  - Error: friendly retry card.
 *  - Empty: full empty-state component with helpful messaging.
 *  - Populated: staggered hostel sections with room strips.
 */
export default function HostelsPage() {
    // URL-synced filter state — page size 8 so each hostel section has breathing room
    const { filters, page, setFilters, setPage, apiParams } =
        useHostelFilters(8);

    const {
        data: hostelPage,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useActiveHostels(apiParams);

    const hostels = hostelPage?.content ?? [];
    const hostelIds = hostels.map((h) => h.id);

    // Parallel room preview fetch — one query per visible hostel, batched via useQueries.
    // Returns a map of hostelId → RoomSummaryDto[] so each section can look up its rooms.
    const { previewsByHostelId, isLoading: isLoadingRooms } =
        useRoomPreviews(hostelIds);

    return (
        <>
            <motion.div
                variants={pageVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
            >
                {/* ── Page header ─────────────────────────────────────── */}
                <PageHeader
                    title="Browse Hostels"
                    description="Find and book accommodation at the University of Cape Coast."
                />

                {/* ── Filters ─────────────────────────────────────────── */}
                <HostelFilters values={filters} onChange={setFilters} />

                {/* ── Content area ────────────────────────────────────── */}
                {isError ? (
                    /* Error state */
                    <EmptyState
                        icon={<Building2 className="h-8 w-8 text-gray-400" />}
                        title="Could not load hostels"
                        description="There was a problem fetching accommodation data. Please try again."
                        action={
                            <button
                                onClick={() => refetch()}
                                className="text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300"
                            >
                                Retry
                            </button>
                        }
                    />
                ) : isLoading ? (
                    /* Loading state — skeleton hostel sections */
                    <div className="space-y-8">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <HostelSectionSkeleton key={i} />
                        ))}
                    </div>
                ) : hostels.length === 0 ? (
                    /* Empty state */
                    <EmptyState
                        icon={<Search className="h-8 w-8 text-gray-400" />}
                        title="No hostels found"
                        description={
                            filters.search || filters.genderPolicy !== 'ALL'
                                ? 'No hostels match your current filters. Try adjusting your search.'
                                : 'No active hostels are available at this time. Check back later.'
                        }
                        action={
                            filters.search || filters.genderPolicy !== 'ALL' ? (
                                <button
                                    onClick={() =>
                                        setFilters({
                                            search: '',
                                            genderPolicy: 'ALL',
                                        })
                                    }
                                    className="text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300"
                                >
                                    Clear filters
                                </button>
                            ) : undefined
                        }
                    />
                ) : (
                    /* Populated — Netflix-style vertical list of hostel sections */
                    <div
                        className={`space-y-8 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
                    >
                        {hostels.map((hostel) => (
                            <HostelWithRoomsSection
                                key={hostel.id}
                                hostel={hostel}
                                rooms={previewsByHostelId[hostel.id] ?? []}
                                isLoadingRooms={isLoadingRooms}
                            />
                        ))}
                    </div>
                )}

                {/* ── Pagination ──────────────────────────────────────── */}
                {hostelPage && hostelPage.totalPages > 1 && (
                    <Pagination
                        currentPage={page}
                        totalPages={hostelPage.totalPages}
                        totalElements={hostelPage.totalElements}
                        onPageChange={setPage}
                        isLoading={isFetching}
                    />
                )}
            </motion.div>
        </>
    );
}

// =============================================================================
// Internal skeleton
// =============================================================================

/**
 * Loading skeleton for a single hostel section (header + horizontal strip).
 * Matches the {@link HostelWithRoomsSection} layout so there is no layout
 * shift when real data arrives.
 */
function HostelSectionSkeleton() {
    return (
        <div
            className="space-y-3 border-b border-gray-100 pb-6 dark:border-gray-800"
            aria-hidden="true"
        >
            {/* Header row skeleton */}
            <div className="flex items-start justify-between px-1">
                <div className="space-y-2">
                    <div className="h-5 w-40 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
                    <div className="h-3 w-56 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800/60" />
                </div>
                <div className="h-8 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800/60" />
            </div>

            {/* Room strip skeleton */}
            <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-42 w-65 shrink-0 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
                    />
                ))}
            </div>
        </div>
    );
}
