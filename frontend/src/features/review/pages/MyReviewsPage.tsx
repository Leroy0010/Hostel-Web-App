import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Star, Building2, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { StarDisplay } from '../components/StarRating';
import { useMyReviews, useDeleteReview } from '../hooks/review.hooks';
import { reviewDateLabel, ratingLabel } from '../utils/review.utils';
import { UpdateReviewForm } from '../components/UpdateReviewForm';
import type { ReviewSummaryDto } from '../types/review.types';

// =============================================================================
// Page component
// =============================================================================

/**
 * Student's own submitted reviews page.
 *
 * Rendered inside an <AppLayout> route wrapper — does NOT import AppLayout (§11).
 *
 * Layout decisions:
 * - Cards use a two-section layout: review content left, actions right on sm+.
 * - Star rating and rating label shown together for context.
 * - Comment previewed at 2 lines to keep list scannable — not truncated abruptly.
 * - Date shown in relative form ("3 days ago") for recency context.
 * - Edit and Delete actions are icon-only on mobile to save space,
 *   with descriptive aria-labels for accessibility.
 * - Framer Motion stagger entrance for the list so the page feels alive.
 */
export default function MyReviewsPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [deleteTarget, setDeleteTarget] = useState<ReviewSummaryDto | null>(
        null
    );
    const [editTarget, setEditTarget] = useState<ReviewSummaryDto | null>(null);

    const {
        data: reviewPage,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useMyReviews({ page, size: 10 });

    const reviews = reviewPage?.content ?? [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
        >
            <PageHeader
                title="My Reviews"
                description="Hostels you have reviewed after your stay."
            />

            {/* ── Content ─────────────────────────────────────────────── */}
            {isError ? (
                <EmptyState
                    icon={<Star className="h-8 w-8 text-gray-400" />}
                    title="Could not load reviews"
                    description="There was a problem fetching your reviews. Please try again."
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
                <ReviewListSkeleton />
            ) : reviews.length === 0 ? (
                <EmptyState
                    icon={<Star className="h-8 w-8 text-gray-400" />}
                    title="No reviews yet"
                    description="You haven't reviewed any hostels. After checking in, you can share your experience from your booking detail page."
                    action={
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/student/bookings')}
                        >
                            View bookings
                        </Button>
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
                        {reviews.map((review) => (
                            <ReviewRow
                                key={review.id}
                                review={review}
                                onEdit={() => setEditTarget(review)}
                                onDelete={() => setDeleteTarget(review)}
                                onNavigate={() =>
                                    navigate(`/hostels/${review.hostelId}`)
                                }
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* ── Pagination ──────────────────────────────────────────── */}
            {reviewPage && reviewPage.totalPages > 1 && (
                <Pagination
                    currentPage={page}
                    totalPages={reviewPage.totalPages}
                    totalElements={reviewPage.totalElements}
                    onPageChange={setPage}
                    isLoading={isFetching}
                />
            )}

            {/* ── Edit dialog ─────────────────────────────────────────── */}
            <Dialog
                open={Boolean(editTarget)}
                onOpenChange={(open) => !open && setEditTarget(null)}
            >
                <DialogContent className="w-full max-w-sm scrollbar-none border-gray-200 bg-white sm:max-w-lg dark:border-gray-800 dark:bg-gray-950">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-gray-100">
                            Edit Review
                        </DialogTitle>
                    </DialogHeader>
                    {editTarget && (
                        <UpdateReviewForm
                            reviewId={editTarget.id}
                            hostelId={editTarget.hostelId}
                            initialComment={editTarget.comment}
                            initialRating={editTarget.rating}
                            onCancel={() => setEditTarget(null)}
                            onSuccess={() => setEditTarget(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Delete confirmation ─────────────────────────────────── */}
            {deleteTarget && (
                <DeleteConfirm
                    review={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </motion.div>
    );
}

// =============================================================================
// ReviewRow card
// =============================================================================

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
    },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.18 } },
};

/**
 * A single review card in the list.
 *
 * UI decisions:
 * - Two-column on sm+: content left, action buttons right.
 * - Rating stars + label together so the score has semantic context.
 * - "View hostel" as a subtle secondary link — the primary intent on this
 *   page is editing/deleting, not navigation.
 * - Edit (pencil) and Delete (trash) buttons are compact icon buttons on
 *   mobile, with full labels readable via aria-label.
 */
function ReviewRow({
    review,
    onEdit,
    onDelete,
    onNavigate,
}: {
    review: ReviewSummaryDto;
    onEdit: () => void;
    onDelete: () => void;
    onNavigate: () => void;
}) {
    return (
        <motion.div
            variants={cardVariants}
            layout
            className="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-shadow duration-200 hover:shadow-sm sm:flex-row sm:items-start dark:border-gray-800 dark:bg-gray-950"
        >
            {/* ── Left: review content ──────────────────────────────── */}
            <div className="min-w-0 flex-1 space-y-2">
                {/* Stars + label row */}
                <div className="flex flex-wrap items-center gap-2">
                    <StarDisplay rating={review.rating} size="sm" />
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {ratingLabel(review.rating)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        · {reviewDateLabel(review.createdAt)}
                    </span>
                </div>

                {/* Comment preview */}
                {review.comment ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                        {review.comment}
                    </p>
                ) : (
                    <p className="text-sm text-gray-400 italic dark:text-gray-600">
                        No comment
                    </p>
                )}

                {/* View hostel link */}
                <button
                    type="button"
                    onClick={onNavigate}
                    className="inline-flex items-center gap-1 text-xs text-gray-400 underline-offset-2 transition-colors hover:text-gray-700 hover:underline dark:text-gray-500 dark:hover:text-gray-300"
                    aria-label="View hostel"
                >
                    <Building2 className="h-3 w-3" aria-hidden="true" />
                    View hostel
                    <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                </button>
            </div>

            {/* ── Right: actions ────────────────────────────────────── */}
            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onEdit}
                    className="h-8 gap-1.5 border-gray-200 px-2.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
                    aria-label="Edit this review"
                >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onDelete}
                    className="h-8 gap-1.5 border-red-200 px-2.5 text-xs text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
                    aria-label="Delete this review"
                >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Delete</span>
                </Button>
            </div>
        </motion.div>
    );
}

// =============================================================================
// DeleteConfirm
// =============================================================================

function DeleteConfirm({
    review,
    onClose,
}: {
    review: ReviewSummaryDto;
    onClose: () => void;
}) {
    const { mutate, isPending } = useDeleteReview(review.id, review.hostelId);

    return (
        <ConfirmDialog
            open
            onOpenChange={(open) => !open && onClose()}
            title="Delete this review?"
            description="Your review will be permanently removed. This cannot be undone."
            confirmLabel="Delete"
            variant="destructive"
            isPending={isPending}
            onConfirm={() => mutate(undefined, { onSuccess: onClose })}
        />
    );
}

// =============================================================================
// Skeleton
// =============================================================================

/**
 * Animated skeleton matching the ReviewRow card dimensions.
 * Three rows with slightly different widths to avoid the "striped" effect.
 */
function ReviewListSkeleton() {
    const widths = ['w-3/4', 'w-full', 'w-2/3'];
    return (
        <div
            className="space-y-3"
            aria-hidden="true"
            aria-label="Loading reviews"
        >
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-start dark:border-gray-800 dark:bg-gray-950"
                >
                    {/* Content skeleton */}
                    <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-24 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                            <div className="h-3.5 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                        </div>
                        <div
                            className={`h-3.5 ${widths[i % widths.length]} animate-pulse rounded-md bg-gray-100 dark:bg-gray-800`}
                        />
                        <div className="h-3 w-1/2 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    </div>
                    {/* Action buttons skeleton */}
                    <div className="flex gap-2 sm:flex-col sm:items-end">
                        <div className="h-8 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                        <div className="h-8 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    </div>
                </div>
            ))}
        </div>
    );
}
