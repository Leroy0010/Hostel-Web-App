import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReactToComplaint } from '../hooks/complaint.hooks';
import { netScoreColorClass } from '../utils/complaint.utils';

interface ReactionBarProps {
    complaintId: string;
    upvotes: number;
    downvotes: number;
    netScore: number;
    /** null = not voted; true = upvoted; false = downvoted */
    currentUserVote: boolean | null;
    /** Disables buttons when the user is not allowed to vote (e.g. they are the author). */
    disabled?: boolean;
}

/**
 * Upvote / downvote reaction bar for complaints.
 *
 * UX principles applied:
 *  - **Optimistic update**: vote counts change instantly; the mutation rolls back
 *    on failure so the user sees immediate feedback without waiting for the server.
 *  - **Toggle behaviour**: pressing the same vote again removes it.
 *  - **Active state styling**: the currently active vote button is visually filled
 *    to give the user unambiguous confirmation of their vote state.
 *  - **Accessible**: each button has an aria-label and aria-pressed state.
 *  - **Net score**: shown between the two buttons as the primary signal; individual
 *    up/downvote counts shown as secondary context.
 *
 * @example
 * ```tsx
 * <ReactionBar
 *   complaintId={complaint.id}
 *   upvotes={complaint.upvotes}
 *   downvotes={complaint.downvotes}
 *   netScore={complaint.netScore}
 *   currentUserVote={complaint.currentUserVote}
 * />
 * ```
 */
export function ReactionBar({
    complaintId,
    upvotes,
    downvotes,
    netScore,
    currentUserVote,
    disabled = false,
}: ReactionBarProps) {
    const { mutate: react, isPending } = useReactToComplaint(complaintId);

    const handleVote = (isUpvote: boolean) => {
        if (disabled || isPending) return;
        react({ isUpvote });
    };

    const isUpvoted = currentUserVote === true;
    const isDownvoted = currentUserVote === false;

    return (
        <div
            className="flex items-center gap-1"
            role="group"
            aria-label="Vote on this complaint"
        >
            {/* Upvote */}
            <button
                type="button"
                onClick={() => handleVote(true)}
                disabled={disabled || isPending}
                aria-pressed={isUpvoted}
                aria-label={`Upvote (${upvotes})`}
                className={cn(
                    'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all duration-150',
                    'focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:outline-none',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    isUpvoted
                        ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700/50 dark:bg-green-950/40 dark:text-green-300'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-green-200 hover:bg-green-50 hover:text-green-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-green-800/50 dark:hover:bg-green-950/20 dark:hover:text-green-400'
                )}
            >
                <ThumbsUp
                    className={cn(
                        'h-3.5 w-3.5 transition-transform duration-100',
                        isUpvoted && 'fill-current'
                    )}
                    aria-hidden="true"
                />
                <span>{upvotes}</span>
            </button>

            {/* Net score */}
            <span
                className={cn(
                    'min-w-8 text-center text-xs font-bold tabular-nums',
                    netScoreColorClass(netScore)
                )}
                aria-label={`Net score: ${netScore > 0 ? '+' : ''}${netScore}`}
            >
                {netScore > 0 ? `+${netScore}` : netScore}
            </span>

            {/* Downvote */}
            <button
                type="button"
                onClick={() => handleVote(false)}
                disabled={disabled || isPending}
                aria-pressed={isDownvoted}
                aria-label={`Downvote (${downvotes})`}
                className={cn(
                    'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all duration-150',
                    'focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    isDownvoted
                        ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700/50 dark:bg-red-950/40 dark:text-red-300'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-red-800/50 dark:hover:bg-red-950/20 dark:hover:text-red-400'
                )}
            >
                <ThumbsDown
                    className={cn(
                        'h-3.5 w-3.5 transition-transform duration-100',
                        isDownvoted && 'fill-current'
                    )}
                    aria-hidden="true"
                />
                <span>{downvotes}</span>
            </button>
        </div>
    );
}
