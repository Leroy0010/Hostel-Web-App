import { Star } from 'lucide-react';
import { StarDisplay } from './StarRating';
import { formatAvgRating } from '../utils/review.utils';
import type { HostelRatingDto } from '../types/review.types';

interface HostelRatingCardProps {
    rating: HostelRatingDto;
    /** When true, renders a compact inline version (for hostel list cards). */
    compact?: boolean;
}

/**
 * Aggregate hostel rating display card.
 *
 * Full mode: large numeric score + star row + total reviews count.
 * Compact mode: inline stars + score for list cards.
 *
 * Displayed on:
 *  - {@link HostelDetailPage} — full mode in the info panel.
 *  - {@link HostelCard} — compact mode in the listing grid.
 *
 * Shows a neutral "No reviews yet" state when {@code totalReviews === 0}.
 */
export function HostelRatingCard({
    rating,
    compact = false,
}: HostelRatingCardProps) {
    const hasReviews = rating.totalReviews > 0;
    const avg = rating.averageRating;

    if (compact) {
        return (
            <div className="flex items-center gap-1.5">
                <Star
                    className="h-3.5 w-3.5 fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300"
                    aria-hidden="true"
                />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {hasReviews ? formatAvgRating(avg) : '—'}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    ({rating.totalReviews})
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            {/* Large numeric score */}
            <div className="flex flex-col items-center">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    {hasReviews ? formatAvgRating(avg) : '—'}
                </span>
                <span className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    out of 5
                </span>
            </div>

            {/* Stars + count */}
            <div className="flex flex-col gap-1.5">
                <StarDisplay rating={avg ?? 0} size="md" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {hasReviews
                        ? `${rating.totalReviews} review${rating.totalReviews !== 1 ? 's' : ''}`
                        : 'No reviews yet'}
                </p>
            </div>
        </div>
    );
}

/** Skeleton matching the full HostelRatingCard layout. */
export function HostelRatingCardSkeleton() {
    return (
        <div className="flex items-start gap-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="space-y-1">
                <div className="h-10 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="space-y-2 pt-1">
                <div className="h-4 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
        </div>
    );
}
