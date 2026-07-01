import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    BedDouble,
    CalendarCheck,
    ChevronDown,
    ChevronUp,
    DoorOpen,
    Image as ImageIcon,
    Info,
    Layers,
    Pencil,
    Settings2,
    Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AmenityChip } from '../components/AmenityChip';
import { RoomStatusBadge } from '../components/RoomStatusBadge';
import { RoomTypeBadge } from '../components/RoomTypeBadge';
import { UpdateRoomForm } from '../components/UpdateRoomForm';
import { AmenityManager } from '../components/AmenityManager';
import { AvailablePeriodsBadge } from '../components/AvailablePeriodsBadge';
import { CreateBookingForm } from '@/features/booking/components/CreateBookingForm';
import { BackButton } from '@/components/ui/BackButton';
import { ZoomableImage } from '@/components/ui/ZoomableImage';
import { useGetRoomAvailablePeriods, useRoomDetail, useDeleteRoom } from '../hooks/room.hooks';
import { bedsLabel, formatPrice, roomImageFallback } from '../utils/room.utils';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { handleUploadImage } from '@/services/cloudinary.service';
import { transition } from '@/features/auth/utils/transition';

// =============================================================================
// Types
// =============================================================================

/**
 * Discriminated union for all dialogs on this page.
 * Only one is ever open at a time.
 */
type ActiveDialog =
    | { kind: 'book' }
    | { kind: 'edit' }
    | { kind: 'amenities' }
    | { kind: 'delete' };

// =============================================================================
// Animation variants
// =============================================================================

const pageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition },
};

// =============================================================================
// Page component
// =============================================================================

/**
 * Shared room detail page for all roles.
 *
 * **Student view:**
 *  1. Back navigation → hostel detail page.
 *  2. Hero cover image (zoomable).
 *  3. Room identity — number, hostel name, type badge, status badge, floor.
 *  4. Key stats grid — capacity, beds available, price per semester.
 *  5. Amenities section — collapsible horizontal strip / expanded grid.
 *  6. Available periods badge.
 *  7. Booking CTA (Book Now dialog) — shown when periods exist + student.
 *  8. Waitlist section — shown to students and guests always.
 *
 * **Manager view (role === 'MANAGER'):**
 *  - Replaces the student action zone entirely with a manager action bar.
 *  - Actions: Edit room (UpdateRoomForm), Manage Amenities (AmenityManager),
 *    Delete room (confirmation → navigate back to the rooms list).
 *  - Waitlist and booking CTAs are not shown to managers.
 *
 * **Why one shared page?**
 *  - `ManagerRoomsPage` links room names here so managers can see the full
 *    public view of the room (image, amenities, stats) before acting on it.
 *  - Avoids two nearly-identical detail pages diverging over time.
 *  - Role-based rendering via `useAuthStore` keeps the branch clean.
 *
 * Route: {@code /hostels/:hostelId/rooms/:roomId} — public.
 */
export default function RoomDetailPage() {
    const { hostelId, roomId } = useParams<{
        hostelId: string;
        roomId: string;
    }>();
    const navigate = useNavigate();

    const { user } = useAuthStore();
    const isStudent = user?.role === 'STUDENT';
    const isManager = user?.role === 'MANAGER';

    const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
    const closeDialog = () => setActiveDialog(null);

    const [isAmenitiesExpanded, setIsAmenitiesExpanded] = useState(false);

    // ── Queries ───────────────────────────────────────────────────────────────
    const {
        data: room,
        isLoading,
        isError,
        refetch,
    } = useRoomDetail(roomId);

    // Available periods are fetched separately — used for booking CTA gating.
    const { data: availablePeriods = [] } =
        useGetRoomAvailablePeriods(roomId!);

    const hasBookingPeriods = availablePeriods.length > 0;

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { mutate: deleteRoom, isPending: isDeleting } = useDeleteRoom(
        hostelId ?? ''
    );

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
                variants={pageVariants}
                initial="hidden"
                animate="visible"
                className="mx-auto max-w-2xl space-y-4"
            >
                {/* ── Back navigation ───────────────────────────────────── */}
                <BackButton
                    onClick={() =>
                        navigate(`/hostels/${hostelId ?? room.hostelId}`)
                    }
                />

                {/* ── Hero image ────────────────────────────────────────── */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
                    <ZoomableImage
                        src={room.imageUrl || roomImageFallback()}
                        alt={`Room ${room.roomNumber}`}
                        className="aspect-video w-full object-cover"
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                                roomImageFallback();
                        }}
                    />
                </div>

                {/* ── Room identity ─────────────────────────────────────── */}
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

                    {room.floorNumber !== null && (
                        <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                            <Layers className="h-4 w-4" aria-hidden="true" />
                            Floor {room.floorNumber}
                        </p>
                    )}
                </div>

                {/* ── Key stats grid ────────────────────────────────────── */}
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

                {/* ── Amenities ─────────────────────────────────────────── */}
                {room.amenities.length > 0 && (
                    <section
                        aria-labelledby="amenities-heading"
                        className="space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <h2
                                id="amenities-heading"
                                className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                            >
                                Amenities
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    setIsAmenitiesExpanded(!isAmenitiesExpanded)
                                }
                                className="h-8 px-2 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                            >
                                {isAmenitiesExpanded ? (
                                    <>
                                        Show less{' '}
                                        <ChevronUp className="ml-1 h-3.5 w-3.5" />
                                    </>
                                ) : (
                                    <>
                                        View details{' '}
                                        <ChevronDown className="ml-1 h-3.5 w-3.5" />
                                    </>
                                )}
                            </Button>
                        </div>

                        <AnimatePresence initial={false} mode="wait">
                            {!isAmenitiesExpanded ? (
                                /* Collapsed — horizontal scroll strip */
                                <motion.div
                                    key="collapsed"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="relative"
                                >
                                    <div
                                        className="pointer-events-none absolute top-0 right-0 h-full w-12 bg-linear-to-l from-gray-50 dark:from-gray-900"
                                        aria-hidden="true"
                                    />
                                    <div className="flex gap-2 overflow-x-auto pb-1 pr-10 scrollbar-none">
                                        {room.amenities.map((amenity) => (
                                            <AmenityChip
                                                key={amenity.id}
                                                amenity={amenity}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            ) : (
                                /* Expanded — responsive grid */
                                <motion.div
                                    key="expanded"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                >
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                        {room.amenities.map((amenity) => (
                                            <div
                                                key={amenity.id}
                                                className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 text-center shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900/50"
                                            >
                                                <div
                                                    className={`flex ${!amenity.imageUrl ? 'h-12 w-12' : 'aspect-video'} shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-900`}
                                                >
                                                    {amenity.imageUrl ? (
                                                        <ZoomableImage
                                                            src={amenity.imageUrl}
                                                            alt={amenity.amenity}
                                                            className="h-full w-full object-cover"
                                                            fallbackNode={
                                                                <ImageIcon className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                                                            }
                                                        />
                                                    ) : (
                                                        <ImageIcon className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                                                    )}
                                                </div>
                                                <span className="text-xs font-medium text-gray-700 md:text-sm dark:text-gray-300">
                                                    {amenity.amenity}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>
                )}

                {/* ── Available periods ─────────────────────────────────── */}
                <AvailablePeriodsBadge periods={availablePeriods} />

                {/* ── Action zone — role-conditional ────────────────────── */}
                {isManager ? (
                    /*
                     * MANAGER action bar.
                     * Replaces the student booking + waitlist zone entirely.
                     * The manager navigated here from ManagerRoomsPage to
                     * inspect the room before taking action.
                     */
                    <ManagerRoomActions
                        roomNumber={room.roomNumber}
                        onEdit={() => setActiveDialog({ kind: 'edit' })}
                        onAmenities={() => setActiveDialog({ kind: 'amenities' })}
                        onDelete={() => setActiveDialog({ kind: 'delete' })}
                    />
                ) : (
                    /*
                     * STUDENT / GUEST action zone.
                     * Primary: Book Now (students only, when periods exist).
                     * Secondary: Waitlist section (always).
                     */
                    <div className="space-y-4">
                        {/* Booking CTA panel */}
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

                                {isStudent && (
                                    <Button
                                        size="lg"
                                        disabled={!hasBookingPeriods}
                                        onClick={() =>
                                            setActiveDialog({ kind: 'book' })
                                        }
                                        className="w-full bg-gray-900 text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                                        aria-disabled={!hasBookingPeriods}
                                    >
                                        {hasBookingPeriods
                                            ? 'Book Now'
                                            : 'Not Available'}
                                    </Button>
                                )}
                            </div>

                            {!hasBookingPeriods && (
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

                        {/*
                         * Waitlist section — shown to students and guests.
                         * Uses availablePeriods from the separate hook so it
                         * correctly reflects current booking availability.
                         */}
                        {/* <WaitlistSection
                            hostelId={hostelId ?? room.hostelId ?? ''}
                            roomType={room.roomType}
                            availablePeriods={availablePeriods}
                        /> */}
                    </div>
                )}
            </motion.div>

            {/* ================================================================
                Dialogs
            ================================================================ */}

            {/* Book room (student) */}
            {roomId && activeDialog?.kind === 'book' && (
                <Dialog open onOpenChange={(open) => !open && closeDialog()}>
                    <DialogContent className="max-w-md border-gray-200 bg-white scrollbar-none sm:max-w-lg dark:border-gray-800 dark:bg-gray-950">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-gray-100">
                                Book Room
                            </DialogTitle>
                            <DialogDescription>
                                <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                                    {room.hostelName} · {room.roomNumber} ·{' '}
                                    {room.roomType} ·{' '}
                                    {formatPrice(room.pricePerSemester)}
                                </span>
                                <span className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                                    <Info className="h-3 w-3" />
                                    Prices are subject to change for future
                                    academic years.
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                        <CreateBookingForm
                            roomId={roomId}
                            onSuccess={closeDialog}
                            availablePeriods={availablePeriods}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Edit room (manager) */}
            {activeDialog?.kind === 'edit' && (
                <Dialog open onOpenChange={(open) => !open && closeDialog()}>
                    <DialogContent className="max-h-[90vh] max-w-2xl scrollbar-none overflow-y-auto border-gray-200 bg-white sm:max-w-lg dark:border-gray-800 dark:bg-gray-950">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-gray-100">
                                Edit Room {room.roomNumber}
                            </DialogTitle>
                        </DialogHeader>
                        <UpdateRoomForm
                            room={room}
                            hostelId={hostelId ?? room.hostelId ?? ''}
                            onSuccess={closeDialog}
                            onCancel={closeDialog}
                            onUploadImage={(file) =>
                                handleUploadImage(file, 'rooms')
                            }
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Manage amenities (manager) */}
            {activeDialog?.kind === 'amenities' && (
                <Dialog open onOpenChange={(open) => !open && closeDialog()}>
                    <DialogContent className="max-h-[90vh] max-w-xl scrollbar-none overflow-y-auto border-gray-200 bg-white sm:max-w-lg dark:border-gray-800 dark:bg-gray-950">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-gray-100">
                                Amenities — Room {room.roomNumber}
                            </DialogTitle>
                        </DialogHeader>
                        <AmenityManager
                            roomId={room.id}
                            hostelId={hostelId ?? room.hostelId ?? ''}
                            currentAmenities={room.amenities}
                            onUploadImage={(file) =>
                                handleUploadImage(file, 'amenities')
                            }
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete room (manager) */}
            {activeDialog?.kind === 'delete' && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && closeDialog()}
                    title={`Delete Room ${room.roomNumber}?`}
                    description="This action is permanent and cannot be undone. All associated bookings may be affected."
                    confirmLabel="Delete"
                    variant="destructive"
                    isPending={isDeleting}
                    onConfirm={() => {
                        deleteRoom(room.id, {
                            onSuccess: () => {
                                closeDialog();
                                // Navigate back to the rooms list after deletion
                                navigate(
                                    `/manager/hostels/${hostelId ?? room.hostelId}/rooms`,
                                    { replace: true }
                                );
                            },
                        });
                    }}
                />
            )}
        </>
    );
}

// =============================================================================
// Manager room actions bar
// =============================================================================

/**
 * Compact manager action bar rendered below room info when the authenticated
 * user is a MANAGER. Surfaces the three most common room management actions
 * without requiring the manager to navigate back to the rooms list.
 *
 * Actions are intentionally minimal — destructive (delete) is visually
 * separated and styled in red to reduce accidental taps on mobile.
 */
function ManagerRoomActions({
    roomNumber,
    onEdit,
    onAmenities,
    onDelete,
}: {
    roomNumber: string;
    onEdit: () => void;
    onAmenities: () => void;
    onDelete: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20"
        >
            {/* Section label */}
            <div className="mb-3 flex items-center gap-2">
                <Settings2
                    className="h-4 w-4 text-blue-600 dark:text-blue-400"
                    aria-hidden="true"
                />
                <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                    Room {roomNumber} — Manager Actions
                </h2>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
                {/* Edit */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onEdit}
                    className="gap-1.5 border-blue-200 bg-white text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-400 dark:hover:bg-blue-900/50"
                >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit Room
                </Button>

                {/* Amenities */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAmenities}
                    className="gap-1.5 border-blue-200 bg-white text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-400 dark:hover:bg-blue-900/50"
                >
                    <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Amenities
                </Button>

                {/* Delete — separated, destructive styling */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onDelete}
                    className="ml-auto gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Delete Room
                </Button>
            </div>
        </motion.div>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================

/**
 * A single stat cell in the three-column stats grid.
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
            <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            {/* Action zone skeleton */}
            <div className="h-28 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
    );
}