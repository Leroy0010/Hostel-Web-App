import { Skeleton } from '@/components/ui/skeleton';

// =============================================================================
// Skeleton
// =============================================================================

/**
 * Concrete loading skeleton for the Student Dashboard.
 * Matches the 4-column stat layout, list views for recent bookings,
 * and the grid layout for waitlist positions.
 */
export function StudentDashboardSkeleton() {
    return (
        <div
            className="space-y-6"
            aria-hidden="true"
            aria-label="Loading student dashboard"
        >
            {/* ── Quick stats skeleton ────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
                    >
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="mt-1 h-8 w-12" />
                    </div>
                ))}
            </div>

            {/* ── Current accommodation skeleton (Optional visual weight) ─── */}
            <Skeleton className="h-24 w-full rounded-xl" />

            {/* ── Recent bookings skeleton ────────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-7 w-16 rounded-md" />
                </div>

                <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3"
                        >
                            <div className="min-w-0 flex-1 space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Waitlist positions skeleton ─────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-7 w-16 rounded-md" />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950"
                        >
                            <div className="min-w-0 flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton className="h-6 w-12 shrink-0 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
