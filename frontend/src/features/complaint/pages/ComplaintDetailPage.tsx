import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    Building2,
    Clock,
    DoorOpen,
    Trash2,
    User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ComplaintStatusBadge } from '../components/ComplaintStatusBadge';
import { ComplaintCategoryBadge } from '../components/ComplaintCategoryBadge';
import { ReactionBar } from '../components/ReactionBar';
import { AttachmentManager } from '../components/AttachmentManager';
import { UpdateComplaintStatusForm } from '../components/UpdateComplaintStatusForm';
import {
    useComplaintDetail,
    useDeleteComplaint,
} from '../hooks/complaint.hooks';
import {
    complaintDateLabel,
    isTerminalComplaintStatus,
} from '../utils/complaint.utils';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { BackButton } from '@/components/ui/BackButton';

// =============================================================================
// Page component
// =============================================================================

/**
 * Full complaint detail page.
 *
 * No AppLayout — rendered inside <AppLayout> route wrapper in AppRoutes (§11).
 *
 * Sections:
 *  1. Back navigation.
 *  2. Header: title, status badge, category badge.
 *  3. ReactionBar: upvote/downvote with optimistic updates.
 *  4. Detail grid: author, hostel, room (if set), dates.
 *  5. Description body.
 *  6. Attachments panel (author/manager can add; author/manager/admin can delete).
 *  7. Manager/Admin: status update form.
 *  8. Student (own OPEN complaint): delete button.
 *
 * Route: {@code /complaints/:complaintId} — all authenticated roles.
 */
export default function ComplaintDetailPage() {
    const { complaintId } = useParams<{ complaintId: string }>();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);

    const [confirmDelete, setConfirmDelete] = useState(false);

    const {
        data: complaint,
        isLoading,
        isError,
        refetch,
    } = useComplaintDetail(complaintId);

    const { mutate: deleteComplaint, isPending: isDeleting } =
        useDeleteComplaint(complaintId ?? '');

    // ── Derived permissions ───────────────────────────────────────────────────
    const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';
    const isAuthor = user?.id === complaint?.author.id;
    const canDelete =
        isAuthor &&
        complaint?.status === 'OPEN' &&
        !isTerminalComplaintStatus(complaint?.status);
    const canManageAttachments = isAuthor || isManagerOrAdmin;
    const canUpdateStatus = isManagerOrAdmin;

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return <ComplaintDetailSkeleton />;
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (isError || !complaint) {
        return (
            <div className="space-y-4">
                <BackButton onClick={() => navigate(-1)} />
                <EmptyState
                    icon={<AlertCircle className="h-8 w-8 text-gray-400" />}
                    title="Complaint not found"
                    description="This complaint may have been removed or you do not have permission to view it."
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
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl space-y-6"
        >
            {/* ── Back ────────────────────────────────────────────────── */}
            <BackButton onClick={() => navigate(-1)} />

            {/* ── Header card ──────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
                {/* Title + badges */}
                <div className="space-y-3">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {complaint.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <ComplaintStatusBadge status={complaint.status} />
                        <ComplaintCategoryBadge category={complaint.category} />
                    </div>
                </div>

                {/* Reaction bar */}
                {user?.role === 'STUDENT' && (
                    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                        <ReactionBar
                            complaintId={complaint.id}
                            upvotes={complaint.upvotes}
                            downvotes={complaint.downvotes}
                            netScore={complaint.netScore}
                            currentUserVote={complaint.currentUserVote}
                            disabled={isAuthor}
                        />
                        {isAuthor && (
                            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-600">
                                You cannot vote on your own complaint.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ── Detail grid ──────────────────────────────────────────── */}
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950">
                <DetailRow
                    icon={<User className="h-4 w-4" />}
                    label="Reported by"
                    value={`${complaint.author.firstName} ${complaint.author.lastName}`}
                />
                <DetailRow
                    icon={<Building2 className="h-4 w-4" />}
                    label="Hostel"
                    value={complaint.hostelName}
                />
                {complaint.roomNumber && (
                    <DetailRow
                        icon={<DoorOpen className="h-4 w-4" />}
                        label="Room"
                        value={`${complaint.roomNumber}`}
                    />
                )}
                <DetailRow
                    icon={<Clock className="h-4 w-4" />}
                    label="Submitted"
                    value={complaintDateLabel(complaint.createdAt)}
                />
                {complaint.resolvedAt && (
                    <DetailRow
                        icon={<Clock className="h-4 w-4" />}
                        label="Resolved"
                        value={complaintDateLabel(complaint.resolvedAt)}
                    />
                )}
            </div>

            {/* ── Description ──────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
                <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                    Description
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {complaint.description}
                </p>
            </div>

            {/* ── Attachments ──────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
                <AttachmentManager
                    complaintId={complaint.id}
                    attachments={complaint.attachments}
                    canAdd={canManageAttachments}
                    currentUserId={user?.id}
                />
            </div>

            {/* ── Manager: status update ───────────────────────────────── */}
            {canUpdateStatus && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
                    <UpdateComplaintStatusForm
                        complaintId={complaint.id}
                        hostelId={complaint.hostelId}
                        currentStatus={complaint.status}
                    />
                </div>
            )}

            {/* ── Student: delete own OPEN complaint ──────────────────── */}
            {canDelete && (
                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDelete(true)}
                        className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete complaint
                    </Button>
                </div>
            )}

            {/* ── Delete confirmation dialog ───────────────────────────── */}
            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={(open) => !open && setConfirmDelete(false)}
                title="Delete this complaint?"
                description="The complaint and all its attachments will be permanently removed."
                confirmLabel="Delete"
                variant="destructive"
                isPending={isDeleting}
                onConfirm={() => {
                    deleteComplaint(undefined, {
                        onSuccess: () => navigate(-1),
                    });
                }}
            />
        </motion.div>
    );
}

function DetailRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3 px-5 py-3.5">
            <span className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                    {label}
                </p>
                <p className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                    {value}
                </p>
            </div>
        </div>
    );
}

function ComplaintDetailSkeleton() {
    return (
        <div
            className="mx-auto max-w-2xl space-y-6"
            aria-hidden="true"
            aria-label="Loading complaint"
        >
            <div className="h-8 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
            <div className="h-40 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-32 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-24 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
    );
}
