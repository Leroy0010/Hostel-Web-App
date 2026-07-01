import { useState } from 'react';
import { motion } from 'framer-motion';
import { ListOrdered } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import { WaitlistCard, WaitlistCardSkeleton } from '../components/WaitlistCard';
import { useMyWaitlists } from '../hooks/waitlist.hooks';
import { transition } from '@/features/auth/utils/transition';

// =============================================================================
// Animation variants
// =============================================================================

const pageVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition },
};

// =============================================================================
// Page
// =============================================================================

/**
 * Student-facing waitlist management page.
 *
 * Shows all hostels the authenticated student is currently queued for,
 * sorted by join date ascending (earliest join shown first).
 *
 * Each entry shows:
 *  - Hostel thumbnail and name.
 *  - Room type, academic year, and semester being waited for.
 *  - Current queue position (color-coded: 1st = amber, 2nd–3rd = blue).
 *  - Notification status (pulsing indicator when promoted to a draft booking).
 *  - Leave queue action with a confirmation dialog.
 *
 * Route: {@code /student/waitlist} — protected, STUDENT only.
 */
export default function StudentWaitlistPage() {
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 10;

    const {
        data: waitlistPage,
        isLoading,
        isError,
        isFetching,
    } = useMyWaitlists({ page, size: PAGE_SIZE });

    const entries = waitlistPage?.content ?? [];

    return (
        <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* ── Page header ─────────────────────────────────────────────── */}
            <PageHeader
                title="My Waitlists"
                description="Hostels and room types you are currently queued for. You'll be notified when a spot becomes available."
            />

            {/* ── Content ─────────────────────────────────────────────────── */}
            {isError ? (
                <EmptyState
                    icon={<ListOrdered className="h-8 w-8 text-gray-400" />}
                    title="Could not load waitlists"
                    description="There was a problem fetching your waitlist entries. Please try again."
                />
            ) : isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <WaitlistCardSkeleton key={i} />
                    ))}
                </div>
            ) : entries.length === 0 ? (
                <EmptyState
                    icon={<ListOrdered className="h-8 w-8 text-gray-400" />}
                    title="You're not on any waitlists"
                    description="When a hostel you want is fully booked, you can join its waitlist from the hostel detail page."
                />
            ) : (
                /*
                 * Dim the list during background re-fetches (page changes)
                 * without hiding it — keeps the layout stable.
                 */
                <div
                    className={`space-y-3 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
                >
                    {entries.map((entry) => (
                        <WaitlistCard key={entry.id} entry={entry} />
                    ))}
                </div>
            )}

            {/* ── Pagination ──────────────────────────────────────────────── */}
            {waitlistPage && waitlistPage.totalPages > 1 && (
                <Pagination
                    currentPage={page}
                    totalPages={waitlistPage.totalPages}
                    totalElements={waitlistPage.totalElements}
                    onPageChange={setPage}
                    isLoading={isFetching}
                />
            )}
        </motion.div>
    );
}
