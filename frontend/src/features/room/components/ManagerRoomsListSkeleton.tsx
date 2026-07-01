/** Loading skeleton matching the room list card layout. */
export function RoomListSkeleton() {
    return (
        <div
            className="space-y-2"
            aria-hidden="true"
            aria-label="Loading rooms"
        >
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className="flex overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                >
                    <div className="h-24 w-36 animate-pulse bg-gray-100 dark:bg-gray-800" />
                    <div className="flex flex-1 flex-col justify-between p-4">
                        <div className="space-y-2">
                            <div className="h-4 w-24 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                            <div className="flex gap-2">
                                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                                <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
                            <div className="h-7 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                            <div className="h-7 w-8 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                            <div className="h-7 w-8 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
