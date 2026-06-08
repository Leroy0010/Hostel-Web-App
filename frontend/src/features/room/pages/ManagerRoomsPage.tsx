import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    DoorOpen,
    Layers,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RoomStatusBadge } from '../components/RoomStatusBadge';
import { RoomTypeBadge } from '../components/RoomTypeBadge';
import { CreateRoomForm } from '../components/CreateRoomForm';
import { UpdateRoomForm } from '../components/UpdateRoomForm';
import { AmenityManager } from '../components/AmenityManager';
import { useAllRooms, useDeleteRoom } from '../hooks/room.hooks';
import { fetchRoomById } from '../api/room.api';
import { bedsLabel, formatPrice, roomImageFallback } from '../utils/room.utils';
import type { RoomDto } from '../types/room.types';

// =============================================================================
// Types
// =============================================================================

/**
 * Discriminated union tracking which dialog is currently open.
 * Exactly one dialog is active at any given time.
 */
type ActiveDialog =
    | { kind: 'create' }
    | { kind: 'edit'; room: RoomDto }
    | { kind: 'amenities'; room: RoomDto }
    | { kind: 'delete'; roomId: string; roomNumber: string };

// =============================================================================
// Component
// =============================================================================

/**
 * Manager room management page for a specific hostel.
 *
 * Features:
 *  - Paginated list of ALL rooms in the hostel (including occupied/maintenance).
 *  - Create room dialog (opens {@link CreateRoomForm}).
 *  - Edit room dialog (opens {@link UpdateRoomForm}, includes status change).
 *  - Manage amenities dialog (opens {@link AmenityManager}).
 *  - Delete room with confirmation dialog.
 *  - Full loading, error, and empty states per §8 of agent2.md.
 *
 * Route: {@code /manager/hostels/:hostelId/rooms} — protected, MANAGER only.
 *
 * The full {@link RoomDto} (with amenities) is fetched on-demand when the
 * edit or amenities dialog is opened, because the list endpoint returns
 * the lighter {@link RoomSummaryDto} without the amenity list.
 */
export default function ManagerRoomsPage() {
    const { hostelId } = useParams<{ hostelId: string }>();
    const navigate = useNavigate();

    const [page, setPage] = useState(0);
    const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
    const [isFetchingFull, setIsFetchingFull] = useState(false);

    const closeDialog = () => setActiveDialog(null);

    // ── Queries ───────────────────────────────────────────────────────────────
    const {
        data: roomPage,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useAllRooms(hostelId, { page, size: 15 });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { mutate: deleteRoom, isPending: isDeleting } = useDeleteRoom(
        hostelId ?? ''
    );

    const rooms = roomPage?.content ?? [];

    /**
     * Fetches the full RoomDto before opening an edit or amenities dialog.
     * The list endpoint returns RoomSummaryDto without the amenity list.
     */
    const openFullRoomDialog = async (
        roomId: string,
        kind: 'edit' | 'amenities'
    ) => {
        setIsFetchingFull(true);
        try {
            const full = await fetchRoomById(roomId);
            setActiveDialog({ kind, room: full });
        } finally {
            setIsFetchingFull(false);
        }
    };

    /**
     * Placeholder upload handler.
     * Replace with real S3/backend upload in production.
     */
    const handleUploadImage = async (file: File): Promise<string> => {
        // TODO: replace with actual upload endpoint
        return URL.createObjectURL(file);
    };

    if (!hostelId) {
        return (
            <EmptyState
                icon={<DoorOpen className="h-8 w-8 text-gray-400" />}
                title="No hostel selected"
                description="Navigate to a hostel to manage its rooms."
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(-1)}
                    >
                        Go back
                    </Button>
                }
            />
        );
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
            >
                {/* ── Back + Page header ───────────────────────────────── */}
                <div className="space-y-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="gap-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Back to my hostels
                    </Button>

                    <PageHeader
                        title="Manage Rooms"
                        description="Add, edit, and manage all rooms for this hostel."
                        actions={
                            <Button
                                onClick={() =>
                                    setActiveDialog({ kind: 'create' })
                                }
                                className="gap-2 bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                New Room
                            </Button>
                        }
                    />
                </div>

                {/* ── Content ──────────────────────────────────────────── */}
                {isError ? (
                    <EmptyState
                        icon={<DoorOpen className="h-8 w-8 text-gray-400" />}
                        title="Could not load rooms"
                        description="There was a problem fetching room data. Please try again."
                        action={
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                            >
                                Retry
                            </Button>
                        }
                    />
                ) : isLoading ? (
                    <RoomListSkeleton />
                ) : rooms.length === 0 ? (
                    <EmptyState
                        icon={<DoorOpen className="h-8 w-8 text-gray-400" />}
                        title="No rooms yet"
                        description="This hostel has no rooms. Create the first one to get started."
                        action={
                            <Button
                                size="sm"
                                onClick={() =>
                                    setActiveDialog({ kind: 'create' })
                                }
                                className="bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                Create room
                            </Button>
                        }
                    />
                ) : (
                    <div
                        className={`space-y-2 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
                    >
                        <AnimatePresence mode="popLayout">
                            {rooms.map((room) => (
                                <motion.div
                                    key={room.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white sm:flex-row dark:border-gray-800 dark:bg-gray-950"
                                >
                                    {/* Thumbnail */}
                                    <div className="h-32 w-full shrink-0 overflow-hidden bg-gray-100 sm:h-auto sm:w-36 dark:bg-gray-800">
                                        <img
                                            src={
                                                room.imageUrl ||
                                                roomImageFallback()
                                            }
                                            alt={`Room ${room.roomNumber}`}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                            onError={(e) => {
                                                (
                                                    e.currentTarget as HTMLImageElement
                                                ).src = roomImageFallback();
                                            }}
                                        />
                                    </div>

                                    {/* Details */}
                                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0 space-y-1">
                                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                    Room {room.roomNumber}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <RoomTypeBadge
                                                        type={room.roomType}
                                                    />
                                                    <RoomStatusBadge
                                                        status={room.status}
                                                    />
                                                    {room.floorNumber !==
                                                        null && (
                                                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                            <Layers className="h-3 w-3" />
                                                            Floor{' '}
                                                            {room.floorNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="font-bold text-gray-900 dark:text-gray-100">
                                                {formatPrice(
                                                    room.pricePerSemester
                                                )}
                                                <span className="ml-0.5 text-xs font-normal text-gray-400">
                                                    /sem
                                                </span>
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {bedsLabel(room.bedsAvailable)}
                                            </span>

                                            {/* Row actions */}
                                            <div className="flex items-center gap-1.5">
                                                {/* Amenities */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isFetchingFull}
                                                    onClick={() =>
                                                        openFullRoomDialog(
                                                            room.id,
                                                            'amenities'
                                                        )
                                                    }
                                                    className="h-7 border-gray-200 px-2 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                                                    aria-label={`Manage amenities for room ${room.roomNumber}`}
                                                >
                                                    Amenities
                                                </Button>

                                                {/* Edit */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isFetchingFull}
                                                    onClick={() =>
                                                        openFullRoomDialog(
                                                            room.id,
                                                            'edit'
                                                        )
                                                    }
                                                    className="h-7 border-gray-200 px-2 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                                                    aria-label={`Edit room ${room.roomNumber}`}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>

                                                {/* Delete */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setActiveDialog({
                                                            kind: 'delete',
                                                            roomId: room.id,
                                                            roomNumber:
                                                                room.roomNumber,
                                                        })
                                                    }
                                                    className="h-7 border-red-200 px-2 text-xs text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
                                                    aria-label={`Delete room ${room.roomNumber}`}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Pagination ──────────────────────────────────────── */}
                {roomPage && roomPage.totalPages > 1 && (
                    <Pagination
                        currentPage={page}
                        totalPages={roomPage.totalPages}
                        totalElements={roomPage.totalElements}
                        onPageChange={setPage}
                        isLoading={isFetching}
                    />
                )}
            </motion.div>

            {/* ================================================================
                Dialogs
            ================================================================ */}

            {/* Create room */}
            <Dialog
                open={activeDialog?.kind === 'create'}
                onOpenChange={(open) => !open && closeDialog()}
            >
                <DialogContent className="max-h-[90vh] w-screen max-w-2xl scrollbar-none overflow-y-auto border-gray-200 bg-white sm:max-w-2xl dark:border-gray-800 dark:bg-gray-950">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-gray-100">
                            Create Room
                        </DialogTitle>
                    </DialogHeader>
                    <CreateRoomForm
                        hostelId={hostelId}
                        onSuccess={closeDialog}
                        onCancel={closeDialog}
                        onUploadImage={handleUploadImage}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit room */}
            {activeDialog?.kind === 'edit' && (
                <Dialog open onOpenChange={(open) => !open && closeDialog()}>
                    <DialogContent className="max-h-[90vh] max-w-2xl scrollbar-none overflow-y-auto border-gray-200 bg-white sm:max-w-2xl dark:border-gray-800 dark:bg-gray-950">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-gray-100">
                                Edit Room {activeDialog.room.roomNumber}
                            </DialogTitle>
                        </DialogHeader>
                        <UpdateRoomForm
                            room={activeDialog.room}
                            hostelId={hostelId}
                            onSuccess={closeDialog}
                            onCancel={closeDialog}
                            onUploadImage={handleUploadImage}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Amenity manager */}
            {activeDialog?.kind === 'amenities' && (
                <Dialog open onOpenChange={(open) => !open && closeDialog()}>
                    <DialogContent className="max-w-xl border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-gray-100">
                                Amenities — Room {activeDialog.room.roomNumber}
                            </DialogTitle>
                        </DialogHeader>
                        <AmenityManager
                            roomId={activeDialog.room.id}
                            hostelId={hostelId}
                            currentAmenities={activeDialog.room.amenities}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete confirmation */}
            {activeDialog?.kind === 'delete' && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && closeDialog()}
                    title={`Delete Room ${activeDialog.roomNumber}?`}
                    description="This action is permanent and cannot be undone. All associated bookings may be affected."
                    confirmLabel="Delete"
                    variant="destructive"
                    isPending={isDeleting}
                    onConfirm={() => {
                        deleteRoom(activeDialog.roomId, {
                            onSuccess: closeDialog,
                        });
                    }}
                />
            )}
        </>
    );
}

// =============================================================================
// Internal skeleton
// =============================================================================

/** Loading skeleton matching the room list card layout. */
function RoomListSkeleton() {
    return (
        <div
            className="space-y-2"
            aria-hidden="true"
            aria-label="Loading rooms"
        >
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className="flex overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                >
                    <div className="h-24 w-36 animate-pulse bg-gray-100 dark:bg-gray-800" />
                    <div className="flex flex-1 flex-col justify-between p-4">
                        <div className="space-y-2">
                            <div className="h-4 w-24 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                            <div className="flex gap-2">
                                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                                <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
                            <div className="h-7 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                            <div className="h-7 w-8 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                            <div className="h-7 w-8 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
