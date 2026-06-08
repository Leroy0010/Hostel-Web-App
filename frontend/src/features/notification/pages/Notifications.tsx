import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BellOff,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    useNotificationFeed,
    useMarkAllAsRead,
    useUnreadCount,
} from '../hooks/useNotifications';
import { NotificationItem } from '../components/NotificationItem';
import { NotificationSkeleton } from '../components/NotificationSkeleton';

export default function NotificationPage() {
    const [page, setPage] = useState(0);
    const pageSize = 20;

    // Queries & Mutations
    const { data, isLoading, isError, refetch } = useNotificationFeed({
        page,
        size: pageSize,
    });
    const { data: unreadCountData } = useUnreadCount();
    const { mutate: markAllAsRead, isPending: isMarkingAllRead } =
        useMarkAllAsRead();

    // Handlers
    const handleNextPage = () => setPage((p) => p + 1);
    const handlePrevPage = () => setPage((p) => Math.max(0, p - 1));

    // Animation container for staggered children
    const listVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
        },
    };

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            {/* ── Page Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        Notifications
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Stay updated with your latest alerts and reminders.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAllAsRead()}
                        disabled={
                            !unreadCountData?.count ||
                            unreadCountData.count === 0 ||
                            isMarkingAllRead
                        }
                        className="bg-white dark:bg-gray-950"
                    >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark all as read
                    </Button>
                </div>
            </div>

            {/* ── Content Area ─────────────────────────────────────────────────────── */}
            <div className="min-h-100">
                {isLoading ? (
                    <NotificationSkeleton />
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-24 text-center dark:border-gray-800 dark:bg-gray-950">
                        <AlertCircle className="mb-4 h-10 w-10 text-red-500" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Failed to load notifications
                        </h3>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                            There was a problem connecting to the server.
                        </p>
                        <Button onClick={() => refetch()} variant="outline">
                            Try again
                        </Button>
                    </div>
                ) : !data?.content || data.content.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-24 text-center dark:border-gray-800 dark:bg-gray-950"
                    >
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-900">
                            <BellOff className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            All caught up!
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            You don't have any notifications right now.
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        variants={listVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-3"
                    >
                        <AnimatePresence mode="popLayout">
                            {data.content.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* ── Pagination ───────────────────────────────────────────────────────── */}
            {!isLoading && !isError && data && data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Page{' '}
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                            {page + 1}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                            {data.totalPages}
                        </span>
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrevPage}
                            disabled={page === 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Previous</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextPage}
                            disabled={page >= data.totalPages - 1}
                        >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Next</span>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
