// =============================================================================
// Skeleton Loader Component
// =============================================================================

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminDashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Row 1: Infrastructure stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="flex flex-col gap-2 p-4">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-5 rounded-md" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-3 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Row 2: Operational alerts */}
            <div className="grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => (
                    <Card
                        key={i}
                        className="flex flex-col items-center justify-center gap-2 p-4"
                    >
                        <Skeleton className="h-4 w-4 rounded-md" />
                        <Skeleton className="h-8 w-12" />
                        <Skeleton className="h-3 w-24" />
                    </Card>
                ))}
            </div>

            {/* Row 3: Table Skeleton */}
            <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Card className="overflow-hidden">
                    <div className="border-b bg-muted/50 p-3">
                        <div className="flex justify-between gap-4">
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </div>
                    <div className="space-y-4 p-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex justify-between gap-4">
                                <Skeleton className="h-4 w-[15%]" />
                                <Skeleton className="h-4 w-[10%]" />
                                <Skeleton className="h-4 w-[10%]" />
                                <Skeleton className="h-4 w-[25%]" />
                                <Skeleton className="h-4 w-[15%]" />
                                <Skeleton className="h-4 w-[10%]" />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Row 4: Funnel + Complaints */}
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Card className="space-y-4 p-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="h-3 w-12" />
                                </div>
                                <Skeleton className="h-1.5 w-full rounded-full" />
                            </div>
                        ))}
                        <div className="flex justify-end pt-1">
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </Card>
                </div>

                <div className="space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Card className="space-y-6 p-4">
                        <div className="grid grid-cols-2 gap-2">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-11 w-full rounded-lg"
                                />
                            ))}
                        </div>
                        <div className="space-y-3">
                            <Skeleton className="h-3 w-20" />
                            <div className="space-y-2">
                                {[...Array(3)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex justify-between"
                                    >
                                        <Skeleton className="h-3 w-24" />
                                        <Skeleton className="h-3 w-8" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
