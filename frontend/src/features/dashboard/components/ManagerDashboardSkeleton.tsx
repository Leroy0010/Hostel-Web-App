import { Skeleton } from '@/components/ui/skeleton';

// =============================================================================
// Skeleton
// =============================================================================

/**
 * Concrete loading skeleton for the Manager Dashboard.
 * Matches the 3-column summary layout and the responsive hostel card grid.
 */
export function ManagerDashboardSkeleton() {
    return (
        <div
            className="space-y-6"
            aria-hidden="true"
            aria-label="Loading manager dashboard"
        >
            {/* ── Summary counters skeleton ──────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-white/50 p-4 text-center dark:border-gray-800 dark:bg-gray-950/50"
                    >
                        {/* Icon */}
                        <Skeleton className="h-4 w-4 rounded-full" />
                        {/* Number */}
                        <Skeleton className="mt-1 h-8 w-12" />
                        {/* Label */}
                        <Skeleton className="mt-1 h-3 w-24" />
                    </div>
                ))}
            </div>

            {/* ── Per-hostel cards skeleton ──────────────────────────────── */}
            <div className="space-y-3">
                {/* Section Heading */}
                <Skeleton className="h-5 w-24" />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
                        >
                            {/* Header (Title + Chevron) */}
                            <div className="flex items-start justify-between gap-2">
                                <Skeleton className="h-5 w-3/5" />
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </div>

                            {/* Occupancy bar */}
                            <div className="mt-1 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-3 w-8" />
                                </div>
                                <Skeleton className="h-1.5 w-full rounded-full" />
                            </div>

                            {/* Counters row */}
                            <div className="flex items-center gap-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                                {Array.from({ length: 3 }).map((_, j) => (
                                    <div
                                        key={j}
                                        className="flex items-center gap-1.5"
                                    >
                                        <Skeleton className="h-3 w-3 rounded-sm" />
                                        <Skeleton className="h-3 w-12" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
