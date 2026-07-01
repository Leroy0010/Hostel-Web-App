/** Full-page loading skeleton. */
export function BookingDetailSkeleton() {
    return (
        <div
            className="mx-auto max-w-2xl space-y-5"
            aria-hidden="true"
            aria-label="Loading booking details"
        >
            {/* Back button */}
            <div className="h-8 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
            {/* Header card */}
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <div className="h-3 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-6 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3.5 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                </div>
            </div>
            {/* Detail rows */}
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                        <div className="h-4 w-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-2.5 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                            <div className="h-3.5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    </div>
                ))}
            </div>
            {/* Action buttons */}
            <div className="flex gap-2">
                <div className="h-9 w-36 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                <div className="h-9 w-32 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
            </div>
        </div>
    );
}
