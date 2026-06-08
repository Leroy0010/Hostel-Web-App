import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Pencil, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { GenderPolicyBadge } from '../components/GenderPolicyBadge';
import { UpdateHostelForm } from '../components/UpdateHostelForm';
import { useMyHostels } from '../hooks/hostel.hooks';
import { fetchHostelById } from '../api/hostel.api';
import { hostelImageFallback } from '../utils/hostel.utils';
import type { HostelDto } from '../types/hostel.types';

// =============================================================================
// Page component
// =============================================================================

/**
 * Manager-facing page listing the hostels assigned to the current manager.
 *
 * Features:
 *  - Paginated card grid of the manager's own hostels.
 *  - Edit hostel button — opens the {@link UpdateHostelForm} in a dialog using
 *    the manager-scoped endpoint ({@code PUT /api/manager/hostels/{id}}).
 *  - "View rooms" shortcut navigating to the manager rooms page.
 *  - Full loading, error, and empty states per §8 of agent2.md.
 *
 * Route: {@code /manager/hostels} — protected, MANAGER only.
 *
 * The edit dialog fetches the full {@link HostelDto} (with coordinates and
 * description) before opening, because {@link HostelSummaryDto} from the list
 * endpoint does not carry all editable fields.
 */
export default function ManagerHostelsPage() {
    const navigate = useNavigate();

    const [page, setPage] = useState(0);
    const [editHostel, setEditHostel] = useState<HostelDto | null>(null);
    const [isFetchingFull, setIsFetchingFull] = useState(false);

    // ── Queries ───────────────────────────────────────────────────────────────
    const {
        data: hostelPage,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useMyHostels({ page, size: 12 });

    const hostels = hostelPage?.content ?? [];

    /**
     * Fetches the full {@link HostelDto} for a hostel summary before opening the
     * edit dialog. The list endpoint returns {@link HostelSummaryDto} which omits
     * description, coordinates, and manager info needed by the form.
     */
    const handleOpenEdit = async (hostelId: string) => {
        setIsFetchingFull(true);
        try {
            const full = await fetchHostelById(hostelId);
            setEditHostel(full);
        } finally {
            setIsFetchingFull(false);
        }
    };

    /**
     * Placeholder upload handler.
     * Replace with a real S3 upload in production.
     *
     * @param file - The validated image file.
     * @returns A promise resolving to the stored public URL.
     */
    const handleUploadImage = async (file: File): Promise<string> => {
        // TODO: replace with actual upload endpoint
        return URL.createObjectURL(file);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
            >
                {/* ── Page header ─────────────────────────────────────── */}
                <PageHeader
                    title="My Hostels"
                    description="Manage the hostels assigned to your account."
                />

                {/* ── Content area ────────────────────────────────────── */}
                {isError ? (
                    <EmptyState
                        icon={<Building2 className="h-8 w-8 text-gray-400" />}
                        title="Could not load your hostels"
                        description="There was a problem fetching your assigned hostels. Please try again."
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
                    /* Skeleton grid */
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <ManagerHostelCardSkeleton key={i} />
                        ))}
                    </div>
                ) : hostels.length === 0 ? (
                    <EmptyState
                        icon={<Building2 className="h-8 w-8 text-gray-400" />}
                        title="No hostels assigned"
                        description="You have no hostels assigned to your account yet. Contact an admin to get assigned."
                    />
                ) : (
                    /* Hostel card grid */
                    <div
                        className={`grid gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
                    >
                        {hostels.map((hostel) => (
                            <motion.div
                                key={hostel.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.25,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                                className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow duration-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
                            >
                                {/* Cover image */}
                                <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
                                    <img
                                        src={
                                            hostel.imageUrl ||
                                            hostelImageFallback()
                                        }
                                        alt={`${hostel.name} cover`}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                            (
                                                e.currentTarget as HTMLImageElement
                                            ).src = hostelImageFallback();
                                        }}
                                    />
                                    {/* Gender badge overlay */}
                                    <div className="absolute top-2 right-2">
                                        <GenderPolicyBadge
                                            policy={hostel.genderPolicy}
                                        />
                                    </div>
                                </div>

                                {/* Card body */}
                                <div className="p-4">
                                    <h3 className="truncate font-semibold text-gray-900 dark:text-gray-100">
                                        {hostel.name}
                                    </h3>
                                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                                        {hostel.address}
                                    </p>

                                    {/* Action row */}
                                    <div className="mt-4 flex items-center gap-2">
                                        {/* Edit */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleOpenEdit(hostel.id)
                                            }
                                            disabled={isFetchingFull}
                                            className="gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                                            aria-label={`Edit ${hostel.name}`}
                                        >
                                            <Pencil
                                                className="h-3.5 w-3.5"
                                                aria-hidden="true"
                                            />
                                            Edit
                                        </Button>

                                        {/* View rooms */}
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                navigate(
                                                    `/manager/hostels/${hostel.id}/rooms`
                                                )
                                            }
                                            className="ml-auto gap-1.5 bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                                            aria-label={`Manage rooms for ${hostel.name}`}
                                        >
                                            Rooms
                                            <ArrowRight
                                                className="h-3.5 w-3.5"
                                                aria-hidden="true"
                                            />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
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

            {/* ── Edit hostel dialog ───────────────────────────────────── */}
            {editHostel && (
                <Dialog
                    open
                    onOpenChange={(open) => !open && setEditHostel(null)}
                >
                    <DialogContent className="max-h-[90vh] max-w-2xl sm:max-w-2xl scrollbar-none overflow-y-auto border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-gray-100">
                                Edit Hostel
                            </DialogTitle>
                        </DialogHeader>
                        <UpdateHostelForm
                            hostel={editHostel}
                            isManager
                            onSuccess={() => setEditHostel(null)}
                            onCancel={() => setEditHostel(null)}
                            onUploadImage={handleUploadImage}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

// =============================================================================
// Internal skeleton
// =============================================================================

/** Skeleton placeholder matching the manager hostel card layout. */
function ManagerHostelCardSkeleton() {
    return (
        <div
            className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
            aria-hidden="true"
        >
            <div className="aspect-video animate-pulse bg-gray-100 dark:bg-gray-800" />
            <div className="space-y-2.5 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-full animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                <div className="flex gap-2 pt-1">
                    <div className="h-8 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    <div className="ml-auto h-8 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                </div>
            </div>
        </div>
    );
}
