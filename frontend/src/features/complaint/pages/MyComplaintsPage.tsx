import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ComplaintCard,
    ComplaintCardSkeleton,
} from '../components/ComplaintCard';
import { useMyComplaints, useDeleteComplaint } from '../hooks/complaint.hooks';
import type {
    ComplaintStatus,
    ComplaintSummaryDto,
} from '../types/complaint.types';
import { useComplaintFilters } from '../hooks/useComplaintFilters';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { CreateComplaintForm } from '../components/CreateComplaintForm';

// =============================================================================
// Page component
// =============================================================================

/**
 * Student's own complaints list.
 *
 * No AppLayout — rendered inside <AppLayout> route wrapper in AppRoutes (§11).
 *
 * Features:
 *  - Status filter synced to URL search params.
 *  - Framer Motion staggered list entrance.
 *  - Delete confirmation for OPEN complaints.
 *  - "New Complaint" CTA — opens a dialog navigating to the hostel detail
 *    page since hostelId context is required for complaint creation.
 *
 * Route: {@code /student/complaints}
 */
export default function MyComplaintsPage() {
    const navigate = useNavigate();
    const [deleteTarget, setDeleteTarget] =
        useState<ComplaintSummaryDto | null>(null);

    // Reuse booking filters hook shape — same URL param pattern
    const { filters, page, setFilters, setPage, apiParams } =
        useComplaintFilters(10);

    const [open, setOpen] = useState(false);

    const {
        data: complaintPage,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useMyComplaints({
        page: apiParams.page,
        size: apiParams.size,
        status: apiParams.status as ComplaintStatus | undefined,
    });

    const complaints = complaintPage?.content ?? [];
    const hasFilter = filters.status !== 'ALL';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
        >
            <PageHeader
                title="My Complaints"
                description="Track the status of issues you have raised."
                actions={
                    <Button
                        size="sm"
                        onClick={() => setOpen(true)}
                        className="gap-1.5 bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        New complaint
                    </Button>
                }
            />

            {/* ── Status filter ────────────────────────────────────────── */}
            <div className="flex items-center gap-2">
                <div className="w-48">
                    <Select
                        value={filters.status}
                        onValueChange={(val) =>
                            setFilters({
                                status: val as ComplaintStatus | 'ALL',
                            })
                        }
                    >
                        <SelectTrigger className="border-gray-200 bg-white text-gray-900 focus:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-600">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <SelectItem value="ALL">All statuses</SelectItem>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">
                                In Progress
                            </SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {hasFilter && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters({ status: 'ALL' })}
                        className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    >
                        Clear
                    </Button>
                )}
            </div>

            {/* ── Content ──────────────────────────────────────────────── */}
            {isError ? (
                <EmptyState
                    icon={<AlertCircle className="h-8 w-8 text-gray-400" />}
                    title="Could not load complaints"
                    description="There was a problem fetching your complaints. Please try again."
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
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <ComplaintCardSkeleton key={i} />
                    ))}
                </div>
            ) : complaints.length === 0 ? (
                <EmptyState
                    icon={<AlertCircle className="h-8 w-8 text-gray-400" />}
                    title={
                        hasFilter ? 'No complaints match' : 'No complaints yet'
                    }
                    description={
                        hasFilter
                            ? 'No complaints match the selected filter.'
                            : 'You have not raised any complaints. Navigate to a hostel to submit one.'
                    }
                    action={
                        hasFilter ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setFilters({ status: 'ALL' })}
                            >
                                Clear filter
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/hostels')}
                            >
                                Browse hostels
                            </Button>
                        )
                    }
                />
            ) : (
                <motion.div
                    className={`space-y-3 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
                    variants={{
                        visible: { transition: { staggerChildren: 0.06 } },
                    }}
                    initial="hidden"
                    animate="visible"
                >
                    <AnimatePresence mode="popLayout">
                        {complaints.map((complaint) => (
                            <ComplaintCard
                                key={complaint.id}
                                complaint={complaint}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* ── Pagination ──────────────────────────────────────────── */}
            {complaintPage && complaintPage.totalPages > 1 && (
                <Pagination
                    currentPage={page}
                    totalPages={complaintPage.totalPages}
                    totalElements={complaintPage.totalElements}
                    onPageChange={setPage}
                    isLoading={isFetching}
                />
            )}

            {/* ── Delete confirmation ─────────────────────────────────── */}
            {deleteTarget && (
                <DeleteConfirm
                    complaint={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                />
            )}

            <Dialog
                open={open}
                onOpenChange={(open) => !open && setOpen(false)}
            >
                <DialogContent className="w-screen sm:max-w-md">
                    <DialogTitle className="hidden"></DialogTitle>
                    <DialogDescription className="hidden">
                        A form for lodging complaints
                    </DialogDescription>
                    <CreateComplaintForm onSuccess={() => setOpen(false)} />
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================

function DeleteConfirm({
    complaint,
    onClose,
}: {
    complaint: ComplaintSummaryDto;
    onClose: () => void;
}) {
    const { mutate, isPending } = useDeleteComplaint(complaint.id);

    return (
        <ConfirmDialog
            open
            onOpenChange={(open) => !open && onClose()}
            title="Delete this complaint?"
            description="The complaint will be permanently removed. This cannot be undone."
            confirmLabel="Delete"
            variant="destructive"
            isPending={isPending}
            onConfirm={() => mutate(undefined, { onSuccess: onClose })}
        />
    );
}
