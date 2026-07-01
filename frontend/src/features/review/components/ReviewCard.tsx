import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { StarDisplay } from './StarRating';
import { reviewDateLabel } from '../utils/review.utils';
import { useDeleteReview } from '../hooks/review.hooks';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useState } from 'react';
import type { ReviewSummaryDto } from '../types/review.types';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

interface ReviewCardProps {
    review: ReviewSummaryDto;
    hostelId: string;
}

/**
 * Summary card for a single review in the hostel review feed.
 *
 * Shows:
 *  - Author avatar initial + name.
 *  - Star rating row + relative date.
 *  - Review comment (capped to 4 lines with a read-more expand).
 *  - Delete button for the review author or admins.
 *
 * Framer Motion entrance animation respects {@code useReducedMotion}.
 */
export function ReviewCard({
    review,
    hostelId,
}: ReviewCardProps) {
    const user = useAuthStore((state) => state.user);
    const isAuthor = user?.id === review.authorId;
    const isAdmin = user?.role === 'ADMIN';
    const canDelete = isAuthor || isAdmin;

    const [expanded, setExpanded] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const { mutate: deleteReview, isPending: isDeleting } = useDeleteReview(
        review.id,
        hostelId
    );

    const comment = review.comment ?? '';
    const isLong = comment.length > 280;
    const displayComment =
        !isLong || expanded ? comment : `${comment.slice(0, 280)}…`;

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors duration-200 dark:border-gray-800 dark:bg-gray-950"
            >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        {/* Avatar initial */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                {review.authorName.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {review.authorName}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {reviewDateLabel(review.createdAt)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <StarDisplay rating={review.rating} size="sm" />
                        {canDelete && (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                aria-label="Delete review"
                                className="rounded-md p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-gray-700 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                            >
                                <Trash2
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                />
                            </button>
                        )}
                    </div>
                </div>

                {/* Comment body */}
                {comment && (
                    <div>
                        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                            {displayComment}
                        </p>
                        {isLong && (
                            <button
                                type="button"
                                onClick={() => setExpanded((p) => !p)}
                                className="mt-1 text-xs font-medium text-gray-500 underline-offset-2 hover:underline dark:text-gray-400"
                            >
                                {expanded ? 'Show less' : 'Read more'}
                            </button>
                        )}
                    </div>
                )}
            </motion.div>

            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title="Delete review?"
                description="This review will be permanently removed."
                confirmLabel="Delete"
                variant="destructive"
                isPending={isDeleting}
                onConfirm={() =>
                    deleteReview(undefined, {
                        onSuccess: () => setConfirmDelete(false),
                    })
                }
            />
        </>
    );
}

/** Skeleton matching ReviewCard layout. */
export function ReviewCardSkeleton() {
    return (
        <div
            className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
            aria-hidden="true"
        >
            <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="space-y-1.5">
                    <div className="h-3.5 w-28 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                </div>
            </div>
            <div className="h-10 w-full animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
        </div>
    );
}
