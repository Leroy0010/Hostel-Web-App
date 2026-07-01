import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

/** Animated skeleton structured to handle both mobile and desktop views appropriately. */
export function ContentSkeleton() {
    return (
        <>
            {/* Mobile Skeleton */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                    >
                        <div className="flex gap-4 p-4">
                            <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                                <div className="mt-2 flex gap-2">
                                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                                    <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between border-t border-gray-100 bg-gray-50/50 p-3 px-4 dark:border-gray-800 dark:bg-gray-900/50">
                            <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="flex gap-2">
                                <div className="h-6 w-6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                <div className="h-6 w-6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Skeleton */}
            <div
                className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block dark:border-gray-800 dark:bg-gray-950"
                aria-label="Loading hostels"
                aria-hidden="true"
            >
                <Table>
                    <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i} className="hover:bg-transparent">
                                <TableCell colSpan={5} className="px-4 py-3">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-14 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3.5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                            <div className="h-3 w-56 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                                        </div>
                                        <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                                        <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
