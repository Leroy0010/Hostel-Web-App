export default function DashboardContent() {
    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">
                        Dashboard Overview
                    </h1>
                </div>

                {/* Showcase responsive adaptive cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="h-32 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800/80 dark:bg-gray-800/40">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Total Bookings
                        </span>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                            1,248
                        </p>
                    </div>
                    <div className="h-32 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800/80 dark:bg-gray-800/40">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Available Rooms
                        </span>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                            42
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
