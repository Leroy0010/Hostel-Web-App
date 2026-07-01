import { forwardRef, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Building2,
    ChevronDown,
    DoorOpen,
    Mail,
    Map,
    MapPin,
    MessageSquareWarning,
    NotebookTabs,
    Phone,
    Settings2,
    Star,
    User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import { GenderPolicyBadge } from '../components/GenderPolicyBadge';
import { HostelStatusBadge } from '../components/HostelStatusBadge';
import { RoomFilterBar } from '../components/RoomsFilterBar';
import {
    DetailedRoomCard,
    DetailedRoomCardSkeleton,
} from '@/features/room/components/DetailedRoomCard';
import { useHostelDetail } from '../hooks/hostel.hooks';
import { useRoomFilters } from '@/features/room/hooks/useRoomFilters';
import { hostelImageFallback } from '../utils/hostel.utils';
// Review feature integration
import {
    HostelRatingCard,
    HostelRatingCardSkeleton,
} from '@/features/review/components/HostelRatingCard';
import {
    ReviewCard,
    ReviewCardSkeleton,
} from '@/features/review/components/ReviewCard';
import {
    useHostelRating,
    useHostelReviews,
} from '@/features/review/hooks/review.hooks';
// Map feature integration
import { NearbyLandmarksPanel } from '@/features/map/components/NearbyLandmarksPanel';
import { transition } from '@/features/auth/utils/transition';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { JoinWaitlistDialog } from '@/features/waitlist/components/JoinWaitlistDialog';
import { ZoomableImage } from '@/components/ui/ZoomableImage';

// =============================================================================
// Animation variants
// =============================================================================

const pageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition },
};

/** Stagger container for section cards (rating, reviews). */
const sectionVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.08,
        },
    },
};

const sectionItemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition },
};

// =============================================================================
// Page component
// =============================================================================

/**
 * Student-facing detail page for a single hostel.
 *
 * ## Architecture change
 * Previously made two separate API calls:
 *   1. `useHostelDetail(id)` → `GET /api/hostels/{id}` (hostel info only)
 *   2. `useAvailableRooms(id, params)` → `GET /api/rooms?hostelId=…` (rooms)
 *
 * Now uses a **single** `useHostelDetail(id, roomParams)` call which maps to
 * `GET /api/hostels/{id}?roomType=&maxPrice=&page=&size=` and returns
 * `HostelDetailsResponseDto { hostel, rooms }` — hostel info and the first page
 * of rooms in one round-trip.
 *
 * Room filter changes (type, max price, page) update the query key, which
 * triggers a re-fetch of the same endpoint with new params — no extra hook.
 *
 * ## Integrated features
 *  - **Reviews** — `HostelRatingCard` aggregate score + `ReviewCard` feed +
 *    `CreateReviewForm` (only rendered when the user is eligible to review).
 *  - **Campus map** — `NearbyLandmarksPanel` (only rendered when the hostel
 *    has coordinates set in the database).
 *
 * ## Sections
 *  1. Hero cover image + status badge overlay.
 *  2. Hostel info panel — name, address, gender policy, description.
 *  3. Manager contact card (if assigned).
 *  4. Rating card + review feed (lazy-loaded; starts fetching after hostel data).
 *  5. Nearby landmarks panel (only when coordinates are available).
 *  6. Room list — filter bar + paginated {@link DetailedRoomCard} cards.
 *
 * Route: `/hostels/:hostelId` (public — guests and authenticated users)
 */
export default function HostelDetailPage() {
    const { hostelId } = useParams<{ hostelId: string }>();
    const navigate = useNavigate();

    const location = useLocation(); // 1. Get the router location state

    const [isMapOpen, setIsMapOpen] = useState(false);

    const [waitlistOpen, setWaitlistOpen] = useState(false);

    // 2. Create a ref for the manager controls
    const controlsRef = useRef<HTMLDivElement>(null);

    const { user } = useAuthStore();

    // Room filter state — drives both the query key and the API params
    const { filters, page, setFilters, setPage, apiParams } =
        useRoomFilters(12);

    // Single combined fetch: hostel info + filtered/paginated room list
    const {
        data: detail,
        isLoading,
        isError,
        refetch,
        isFetching: isFetchingDetail,
    } = useHostelDetail(hostelId, apiParams);

    const hostel = detail?.hostel;
    const roomPage = detail?.rooms;
    const rooms = roomPage?.content ?? [];

    // isFetchingRooms is true when only the room params changed (background refetch)
    // isLoading is true on the very first fetch (no cached data yet)
    const isFetchingRooms = isFetchingDetail && !isLoading;

    // ── Authorization Check ───────────────────────────────────────────────────
    // Check if the current user is a manager AND owns this specific hostel
    const isHostelManager =
        user?.role === 'MANAGER' && hostel?.manager?.id === user?.id;

    // 3. Add a useEffect to handle the scrolling once data is loaded
    useEffect(() => {
        // Check if we are loading, if the flag is true, and if the ref exists
        if (
            !isLoading &&
            location.state?.scrollToControls &&
            controlsRef.current
        ) {
            // Add a tiny timeout to ensure Framer Motion animations have started
            // and the element is fully painted in its final position
            setTimeout(() => {
                controlsRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center', // 'start' aligns it to the top, 'center' puts it in the middle of the screen
                });
            }, 200);

            // Optional: Clear the state so refreshing the page doesn't scroll again
            window.history.replaceState({}, document.title);
        }
    }, [isLoading, location.state]);

    // ── Loading state ─────────────────────────────────────────────────────────
    if (isLoading) {
        return <HostelDetailSkeleton />;
    }

    // ── Error / not-found state ───────────────────────────────────────────────
    if (isError || !hostel) {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="gap-1.5 text-gray-600 dark:text-gray-400"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
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
                            onClick={() => refetch()}
                        >
                            Try again
                        </Button>
                    }
                />
            </div>
        );
    }

    const hasCoordinates =
        hostel.latitude !== null && hostel.longitude !== null;

    return (
        <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* ── Back navigation ───────────────────────────────────────── */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/hostels')}
                className="gap-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to hostels
            </Button>

            {/* ── Hero cover image ──────────────────────────────────────── */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
                <ZoomableImage
                    src={hostel.imageUrl || hostelImageFallback()}
                    alt={`${hostel.name} cover image`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                            hostelImageFallback();
                    }}
                />
                {/* Active/inactive status badge — top-right overlay */}
                <div className="absolute top-3 right-3">
                    <HostelStatusBadge isActive={hostel.isActive} />
                </div>
            </div>

            {/* ── MANAGER ACTION BAR (Conditionally Rendered) ───────────── */}
            {isHostelManager && (
                <ManagerActionBar hostelId={hostel.id} ref={controlsRef} />
            )}

            {/* ── Hostel info panel ─────────────────────────────────────── */}
            <motion.div
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
            >
                {/* Title + gender badge */}
                <motion.div
                    variants={sectionItemVariants}
                    className="flex flex-wrap items-start justify-between gap-3"
                >
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
                </motion.div>

                {/* Description */}
                {hostel.description && (
                    <motion.p
                        variants={sectionItemVariants}
                        className="text-sm leading-relaxed text-gray-600 dark:text-gray-400"
                    >
                        {hostel.description}
                    </motion.p>
                )}

                {/* Manager contact card */}
                {hostel.manager && (
                    <motion.div
                        variants={sectionItemVariants}
                        className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
                    >
                        <p className="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
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
                                className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                            >
                                <Mail className="h-4 w-4" aria-hidden="true" />
                                {hostel.manager.email}
                            </a>
                            <a
                                href={`tel:${hostel.manager.phone}`}
                                className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                            >
                                <Phone className="h-4 w-4" aria-hidden="true" />
                                {hostel.manager.phone}
                            </a>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* ── Rating + Reviews section ──────────────────────────────── */}
            {/*
             * Reviews are lazy-loaded in a separate section below the main
             * hostel info. This keeps the critical paint path fast — the hero,
             * info panel, and room list are all served from a single API call
             * while reviews come in separately.
             */}
            <ReviewsSection hostelId={hostel.id} />

            {/* ── Nearby landmarks (map panel) ──────────────────────────── */}
            {/*
             * Only rendered when the hostel has coordinates stored in PostGIS.
             * If latitude/longitude are null, the panel is hidden entirely rather
             * than showing an error — the feature simply isn't available for this hostel.
             */}
            {/* ── Nearby landmarks (map panel) ──────────────────────────── */}
            {hasCoordinates && (
                <div className="space-y-3">
                    {/* The Toggle Button */}
                    <Button
                        variant="outline"
                        onClick={() => setIsMapOpen(!isMapOpen)}
                        className="w-full justify-between border-gray-200 bg-white py-5 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
                    >
                        <div className="flex items-center gap-2">
                            <Map
                                className="h-4 w-4 text-gray-500 dark:text-gray-400"
                                aria-hidden="true"
                            />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                Location & Nearby Landmarks
                            </span>
                        </div>
                        <motion.div
                            animate={{ rotate: isMapOpen ? 180 : 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                        >
                            <ChevronDown
                                className="h-4 w-4 text-gray-500 dark:text-gray-400"
                                aria-hidden="true"
                            />
                        </motion.div>
                    </Button>

                    {/* The Smooth Accordion Content */}
                    <AnimatePresence initial={false}>
                        {isMapOpen && (
                            <motion.div
                                key="nearby-landmarks"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{
                                    duration: 0.3,
                                    ease: [0.04, 0.62, 0.23, 0.98], // A very smooth, spring-like easing curve
                                }}
                                className="overflow-hidden"
                            >
                                <NearbyLandmarksPanel
                                    hostelId={hostel.id}
                                    radiusMetres={1000}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Room list section ─────────────────────────────────────── */}
            <div className="space-y-4">
                {/* Section header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Available Rooms
                    </h2>
                    {roomPage && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {roomPage.totalElements}{' '}
                            {roomPage.totalElements === 1 ? 'room' : 'rooms'}
                        </span>
                    )}
                </div>

                {/* ── NEW: Secondary Waitlist Trigger ────────────────────────── */}
                {user?.role === 'STUDENT' && (
                    <div className="-mt-2 mb-4">
                        <button
                            onClick={() => setWaitlistOpen(true)}
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            Not finding what you need for your preferred period?
                            Join our waitlist.
                        </button>
                    </div>
                )}

                {/* Room type + max price filters */}
                <RoomFilterBar filters={filters} onFiltersChange={setFilters} />

                {/* Room cards — dimmed during background re-fetches */}
                <div
                    className={`space-y-3 transition-opacity duration-200 ${
                        isFetchingRooms ? 'opacity-60' : 'opacity-100'
                    }`}
                >
                    {/*
                     * isLoading covers the initial full-page load (handled above by
                     * HostelDetailSkeleton), but isFetchingRooms can be true when the
                     * user changes a room filter mid-page — show skeletons in that case.
                     */}
                    {isFetchingRooms && rooms.length === 0 ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <DetailedRoomCardSkeleton key={i} />
                        ))
                    ) : rooms.length === 0 ? (
                        // Inside your return block, replace the EmptyState action logic
                        <EmptyState
                            icon={
                                <DoorOpen className="h-8 w-8 text-gray-400" />
                            }
                            title="No rooms found"
                            description={
                                filters.roomType !== 'ALL' || filters.maxPrice
                                    ? 'No rooms match your filters. Try adjusting your search or join our waitlist.'
                                    : 'No rooms are currently available in this hostel. Join our waitlist to be notified when one opens up.'
                            }
                            action={
                                <div className="flex gap-2">
                                    {/* Show 'Clear filters' if filters are active */}
                                    {(filters.roomType !== 'ALL' ||
                                        filters.maxPrice) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive"
                                            onClick={() =>
                                                setFilters({
                                                    roomType: 'ALL',
                                                    maxPrice: '',
                                                })
                                            }
                                        >
                                            Clear filters
                                        </Button>
                                    )}
                                    {/* The Join Waitlist Trigger */}
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => setWaitlistOpen(true)}
                                    >
                                        Join Waitlist
                                    </Button>
                                </div>
                            }
                        />
                    ) : (
                        rooms.map((room) => (
                            <DetailedRoomCard
                                key={room.id}
                                room={room}
                                hostelId={hostelId ?? ''}
                            />
                        ))
                    )}
                </div>

                {/* Room pagination */}
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

            <JoinWaitlistDialog
                hostelId={hostelId!}
                onOpenChange={setWaitlistOpen}
                open={waitlistOpen}
                defaultRoomType={
                    filters.roomType && filters.roomType !== 'ALL'
                        ? filters.roomType
                        : 'SINGLE'
                }
            />
        </motion.div>
    );
}

// =============================================================================
// Reviews sub-section
// =============================================================================

/**
 * Lazy-loaded reviews section embedded in the hostel detail page.
 *
 * Fetches the hostel's aggregate rating and paginated review feed independently
 * of the main hostel + rooms call, so the primary content is never blocked by
 * review data.
 *
 * Renders:
 *  1. {@link HostelRatingCard} — aggregate score and star display.
 *  2. Paginated {@link ReviewCard} feed — sorted newest first (backend default).
 *  3. {@link CreateReviewForm} — only shown to eligible students (the backend
 *     enforces the "checked-in" constraint; the form is always visible to
 *     authenticated students and relies on the backend to reject ineligible requests).
 *
 * @param hostelId - UUID of the hostel whose reviews to display.
 */
function ReviewsSection({ hostelId }: { hostelId: string }) {
    const [reviewPage, setReviewPage] = useState(0);
    const REVIEW_PAGE_SIZE = 5;

    const { data: rating, isLoading: isLoadingRating } =
        useHostelRating(hostelId);

    const {
        data: reviewFeed,
        isLoading: isLoadingReviews,
        isFetching: isFetchingReviews,
    } = useHostelReviews(hostelId, {
        page: reviewPage,
        size: REVIEW_PAGE_SIZE,
    });

    const reviews = reviewFeed?.content ?? [];

    return (
        <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
        >
            {/* Section header */}
            <motion.div
                variants={sectionItemVariants}
                className="flex items-center gap-2"
            >
                <Star
                    className="h-4 w-4 text-amber-400 dark:text-amber-300"
                    aria-hidden="true"
                />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Reviews
                </h2>
            </motion.div>

            {/* Aggregate rating card */}
            <motion.div variants={sectionItemVariants}>
                {isLoadingRating ? (
                    <HostelRatingCardSkeleton />
                ) : rating ? (
                    <HostelRatingCard rating={rating} />
                ) : null}
            </motion.div>

            {/* Review feed */}
            <motion.div
                variants={sectionItemVariants}
                className={`space-y-3 transition-opacity duration-200 ${
                    isFetchingReviews && !isLoadingReviews
                        ? 'opacity-60'
                        : 'opacity-100'
                }`}
            >
                {isLoadingReviews ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <ReviewCardSkeleton key={i} />
                    ))
                ) : reviews.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400 dark:border-gray-800 dark:text-gray-600">
                        No reviews yet. Be the first to share your experience.
                    </p>
                ) : (
                    reviews.map((review) => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            hostelId={hostelId}
                        />
                    ))
                )}
            </motion.div>

            {/* Review pagination */}
            {reviewFeed && reviewFeed.totalPages > 1 && (
                <Pagination
                    currentPage={reviewPage}
                    totalPages={reviewFeed.totalPages}
                    totalElements={reviewFeed.totalElements}
                    onPageChange={setReviewPage}
                    isLoading={isFetchingReviews}
                />
            )}
        </motion.div>
    );
}

/**
 * Renders a distinct control panel for the manager of the hostel.
 * Scalable for adding new features (Analytics, Settings, etc.) later.
 */
const ManagerActionBar = forwardRef<HTMLDivElement, { hostelId: string }>(
    ({ hostelId }, ref) => {
        const navigate = useNavigate();

        return (
            <motion.div
                ref={ref}
                variants={sectionItemVariants}
                className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20"
            >
                <div className="mb-3 flex items-center gap-2">
                    <Settings2
                        className="h-5 w-5 text-blue-600 dark:text-blue-400"
                        aria-hidden="true"
                    />
                    <h2 className="font-semibold text-blue-900 dark:text-blue-300">
                        Manager Controls
                    </h2>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Button
                        variant="outline"
                        onClick={() =>
                            navigate(`/manager/hostels/${hostelId}/rooms`)
                        }
                        className="w-full gap-2 border-blue-200 bg-white text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-400 dark:hover:bg-blue-900/50"
                    >
                        <DoorOpen className="h-4 w-4" />
                        Rooms
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() =>
                            navigate(`/manager/hostels/${hostelId}/bookings`)
                        }
                        className="w-full gap-2 border-blue-200 bg-white text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-400 dark:hover:bg-blue-900/50"
                    >
                        <NotebookTabs className="h-4 w-4" />
                        Bookings
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() =>
                            navigate(`/manager/hostels/${hostelId}/complaints`)
                        }
                        className="w-full gap-2 border-blue-200 bg-white text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-400 dark:hover:bg-blue-900/50"
                    >
                        <MessageSquareWarning className="h-4 w-4" />
                        Complaints
                    </Button>
                </div>
            </motion.div>
        );
    }
);

// =============================================================================
// Full-page skeleton
// =============================================================================

/**
 * Full-page loading skeleton shown during the initial data fetch.
 *
 * Structurally mirrors the final page layout (hero → info → rating → rooms)
 * so there is no layout shift when the real content arrives.
 */
function HostelDetailSkeleton() {
    return (
        <div className="space-y-6" aria-hidden="true">
            {/* Back button skeleton */}
            <div className="h-8 w-28 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />

            {/* Hero skeleton */}
            <div className="aspect-video w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />

            {/* Info skeleton */}
            <div className="space-y-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <div className="h-7 w-64 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
                        <div className="h-4 w-48 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="h-16 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>

            {/* Rating skeleton */}
            <HostelRatingCardSkeleton />

            {/* Room cards skeleton */}
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <DetailedRoomCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}
