import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, Paperclip } from 'lucide-react';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';
import { ComplaintCategoryBadge } from './ComplaintCategoryBadge';
import {
    complaintDateLabel,
    netScoreColorClass,
} from '../utils/complaint.utils';
import { cn } from '@/lib/utils';
import type { ComplaintSummaryDto } from '../types/complaint.types';

interface ComplaintCardProps {
    complaint: ComplaintSummaryDto;
}

/**
 * Summary card for a single complaint in list views.
 *
 * Displays:
 *  - Title (primary — the user's main scan target).
 *  - Status and category badges for instant categorisation.
 *  - Net score (upvotes − downvotes) for priority signalling.
 *  - Attachment count as a secondary detail.
 *  - Hostel name and relative creation date.
 *  - Framer Motion lift-on-hover for tactile feedback.
 *
 * Tapping navigates to the full complaint detail page.
 */
export function ComplaintCard({ complaint }: ComplaintCardProps) {
    const navigate = useNavigate();

    return (
        <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
        >
            <button
                type="button"
                className="w-full rounded-xl text-left focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:outline-none"
                onClick={() => navigate(`/complaints/${complaint.id}`)}
                aria-label={`View complaint: ${complaint.title}`}
            >
                <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-shadow duration-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-2">
                        {/* Title */}
                        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
                            {complaint.title}
                        </p>

                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <ComplaintStatusBadge status={complaint.status} />
                            <ComplaintCategoryBadge
                                category={complaint.category}
                            />
                        </div>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <Building2
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                />
                                {complaint.hostelName}
                            </span>

                            {complaint.attachmentCount > 0 && (
                                <span className="flex items-center gap-1">
                                    <Paperclip
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                    />
                                    {complaint.attachmentCount}
                                </span>
                            )}

                            <span>
                                {complaintDateLabel(complaint.createdAt)}
                            </span>
                        </div>
                    </div>

                    {/* Right: score + chevron */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                            className={cn(
                                'text-sm font-bold tabular-nums',
                                netScoreColorClass(complaint.netScore)
                            )}
                            aria-label={`Net score: ${complaint.netScore}`}
                        >
                            {complaint.netScore > 0
                                ? `+${complaint.netScore}`
                                : complaint.netScore}
                        </span>
                        <ChevronRight
                            className="h-4 w-4 text-gray-300 dark:text-gray-700"
                            aria-hidden="true"
                        />
                    </div>
                </div>
            </button>
        </motion.div>
    );
}

/** Skeleton matching ComplaintCard layout. */
export function ComplaintCardSkeleton() {
    return (
        <div
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
            aria-hidden="true"
        >
            <div className="flex-1 space-y-2.5">
                <div className="h-4 w-3/4 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                <div className="flex gap-1.5">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                    <div className="h-5 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="h-3 w-1/2 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="h-5 w-6 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
        </div>
    );
}
