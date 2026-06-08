import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Building2,
    MapPin,
    User,
    Phone,
    Mail,
    DoorOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import { GenderPolicyBadge } from '../components/GenderPolicyBadge';
import { HostelStatusBadge } from '../components/HostelStatusBadge';
import {
    DetailedRoomCard,
    DetailedRoomCardSkeleton,
} from '@/features/room/components/DetailedRoomCard';
import { useHostelDetail } from '../hooks/hostel.hooks';
import { useAvailableRooms } from '@/features/room/hooks/room.hooks';
import { useRoomFilters } from '@/features/room/hooks/useRoomFilters';
import { hostelImageFallback } from '../utils/hostel.utils';

import { RoomFilterBar } from '../components/RoomsFilterBar';

// =============================================================================
// Component
// =============================================================================

/**
 * Student-facing detail page for a single hostel.
 *
 * Sections:
 *  1. Hero cover image with back-navigation arrow.
 *  2. Info panel — name, address, gender policy, status, description.
 *  3. Manager contact card (if assigned).
 *  4. Room filters — type, max price (passed to API, no client-side filtering).
 *  5. Paginated vertical room list using {@link DetailedRoomCard}.
 *
 * URL structure: {@code /hostels/:hostelId}
 *
 * Passes filter values directly to {@link useAvailableRooms} — no client-side
 * filtering logic per project requirements.
 */
export default function HostelDetailPage() {
    const { hostelId } = useParams<{ hostelId: string }>();
    const navigate = useNavigate();

    // Hostel data
    const {
        data: hostel,
        isLoading: isLoadingHostel,
        isError: isHostelError,
        refetch: refetchHostel,
    } = useHostelDetail(hostelId);

    // Room filters synced to URL
    const { filters, page, setFilters, setPage, apiParams } =
        useRoomFilters(12);

    // Available rooms under this hostel
    const {
        data: roomPage,
        isLoading: isLoadingRooms,
        isFetching: isFetchingRooms,
    } = useAvailableRooms(hostelId, apiParams);

    const rooms = roomPage?.content ?? [];

    // ── Loading state ─────────────────────────────────────────────────────────
    if (isLoadingHostel) {
        return <HostelDetailSkeleton />;
    }

    // ── Error state ───────────────────────────────────────────────────────────
    if (isHostelError || !hostel) {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="gap-1.5 text-gray-600 dark:text-gray-400"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <EmptyState
                    icon={<Building2 className="h-8 w-8 text-gray-400" />}
                    title="Hostel not found"
                    description="This hostel may have been removed or the link is incorrect."
                    action={
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetchHostel()}
                        >
                            Try again
                        </Button>
                    }
                />
            </div>
        );
    }

    // ── Adapter: room filter values live in a slightly different shape than hostel filters
    // The HostelFilters component is reused for display only — we adapt its onChange
    // const roomFiltersAsHostelFilters: HostelFilterValues = {
    //     search: '',
    //     genderPolicy: (filters.genderPolicy ?? 'ALL') as GenderPolicy | 'ALL',
    // };

    // const handleRoomFilterChange = (vals: HostelFilterValues) => {
    //     const adapted: RoomFilterValues = {
    //         roomType: filters.roomType,
    //         maxPrice: filters.maxPrice,
    //     };
    //     setFilters(adapted);
    //     // Suppress unused variable — room filters use their own controls below
    //     void vals;
    // };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
            >
                {/* ── Back navigation ─────────────────────────────────── */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="gap-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to hostels
                </Button>

                {/* ── Hero cover image ─────────────────────────────────── */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
                    <img
                        src={hostel.imageUrl || hostelImageFallback()}
                        alt={`${hostel.name} cover image`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                                hostelImageFallback();
                        }}
                    />
                    {/* Status badge overlay */}
                    <div className="absolute top-3 right-3">
                        <HostelStatusBadge isActive={hostel.isActive} />
                    </div>
                </div>

                {/* ── Hostel info ──────────────────────────────────────── */}
                <div className="space-y-4">
                    {/* Title + gender badge */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                {hostel.name}
                            </h1>
                            <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <MapPin
                                    className="h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                />
                                {hostel.address}
                            </p>
                        </div>
                        <GenderPolicyBadge policy={hostel.genderPolicy} />
                    </div>

                    {/* Description */}
                    {hostel.description && (
                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                            {hostel.description}
                        </p>
                    )}

                    {/* Manager contact card */}
                    {hostel.manager && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                            <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                                Contact Manager
                            </p>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <User
                                        className="h-4 w-4 text-gray-400"
                                        aria-hidden="true"
                                    />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {hostel.manager.firstName}{' '}
                                        {hostel.manager.lastName}
                                    </span>
                                </div>
                                <a
                                    href={`mailto:${hostel.manager.email}`}
                                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                                >
                                    <Mail
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    {hostel.manager.email}
                                </a>
                                <a
                                    href={`tel:${hostel.manager.phone}`}
                                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                                >
                                    <Phone
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    {hostel.manager.phone}
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Room list section ────────────────────────────────── */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Available Rooms
                        </h2>
                        {roomPage && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {roomPage.totalElements} room
                                {roomPage.totalElements !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Room type + max price filters */}
                    <RoomFilterBar
                        filters={filters}
                        onFiltersChange={setFilters}
                    />

                    {/* Room cards */}
                    <div
                        className={`space-y-3 transition-opacity duration-200 ${isFetchingRooms ? 'opacity-60' : 'opacity-100'}`}
                    >
                        {isLoadingRooms ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <DetailedRoomCardSkeleton key={i} />
                            ))
                        ) : rooms.length === 0 ? (
                            <EmptyState
                                icon={
                                    <DoorOpen className="h-8 w-8 text-gray-400" />
                                }
                                title="No rooms found"
                                description={
                                    filters.roomType !== 'ALL' ||
                                    filters.maxPrice
                                        ? 'No rooms match your filters. Try adjusting your search.'
                                        : 'No rooms are currently available in this hostel.'
                                }
                            />
                        ) : (
                            rooms.map((room) => (
                                <DetailedRoomCard
                                    key={room.id}
                                    room={
                                        room as Parameters<
                                            typeof DetailedRoomCard
                                        >[0]['room']
                                    }
                                    hostelId={hostel.id}
                                />
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {roomPage && roomPage.totalPages > 1 && (
                        <Pagination
                            currentPage={page}
                            totalPages={roomPage.totalPages}
                            totalElements={roomPage.totalElements}
                            onPageChange={setPage}
                            isLoading={isFetchingRooms}
                        />
                    )}
                </div>
            </motion.div>
        </>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================

/** Full-page skeleton matching the HostelDetailPage layout. */
function HostelDetailSkeleton() {
    return (
        <div className="space-y-6" aria-hidden="true">
            {/* Back button skeleton */}
            <div className="h-8 w-28 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
            {/* Hero skeleton */}
            <div className="aspect-video w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            {/* Info skeleton */}
            <div className="space-y-3">
                <div className="h-7 w-64 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
                <div className="h-4 w-48 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                <div className="h-16 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
            {/* Room cards skeleton */}
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <DetailedRoomCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}
