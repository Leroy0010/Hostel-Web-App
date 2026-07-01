import { motion } from 'framer-motion';
import {
    CheckCircle,
    XCircle,
    Ban,
    Clock,
    ArrowUpCircle,
    FileText,
    RefreshCw,
    Bell,
    Circle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type {
    NotificationResponse,
    NotificationType,
} from '../types/notification.types';
import { useMarkAsRead } from '../hooks/useNotifications'; // Adjust path to where your hooks are
import { formatRelativeTime } from '../utils/date.utils';

interface NotificationItemProps {
    notification: NotificationResponse;
}

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

const getIconForType = (type: NotificationType) => {
    switch (type) {
        case 'BOOKING_APPROVED':
            return <CheckCircle className="h-5 w-5 text-emerald-500" />;
        case 'BOOKING_REJECTED':
            return <XCircle className="h-5 w-5 text-red-500" />;
        case 'BOOKING_CANCELLED':
            return <Ban className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
        case 'CHECKIN_REMINDER':
            return <Clock className="h-5 w-5 text-blue-500" />;
        case 'WAITLIST_PROMOTED':
            return <ArrowUpCircle className="h-5 w-5 text-purple-500" />;
        case 'COMPLAINT_CREATED':
            return <FileText className="h-5 w-5 text-orange-500" />;
        case 'COMPLAINT_UPDATED':
            return <RefreshCw className="h-5 w-5 text-teal-500" />;
        case 'GENERAL':
        default:
            return (
                <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            );
    }
};

export function NotificationItem({ notification }: NotificationItemProps) {
    const { mutate: markAsRead } = useMarkAsRead();
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        // If there is a link, handle navigation manually
        if (notification.navigateUrl) {
            e.preventDefault(); // Stop the Link from changing the page instantly

            if (!notification.isRead) {
                // Wait for the server to finish before moving pages
                markAsRead(notification.id, {
                    onSettled: () => {
                        navigate(notification.navigateUrl!);
                    },
                });
            } else {
                // If already read, just move pages immediately
                navigate(notification.navigateUrl);
            }
        }
    };

    return (
        <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            whileHover={{ y: -2 }}
            className={`group relative flex items-start gap-4 rounded-xl border p-4 transition-colors duration-200 ${
                notification.isRead
                    ? 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'
                    : 'border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10'
            }`}
        >
            <div className="mt-1 shrink-0">
                {getIconForType(notification.type)}
            </div>

            <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                    <p
                        className={`text-sm font-medium ${
                            notification.isRead
                                ? 'text-gray-900 dark:text-gray-100'
                                : 'text-gray-900 dark:text-gray-100'
                        }`}
                    >
                        {notification.title}
                    </p>
                    <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeTime(notification.createdAt)}
                    </span>
                </div>

                <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                    {notification.message}
                </p>

                {notification.navigateUrl && (
                    <div className="pt-2">
                        <Link
                            to={notification.navigateUrl}
                            onClick={handleClick}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            View details &rarr;
                        </Link>
                    </div>
                )}
            </div>

            {!notification.isRead && (
                <div className="absolute top-1.5 right-4">
                    <Circle className="h-2.5 w-2.5 fill-blue-600 text-blue-600 dark:fill-blue-500 dark:text-blue-500" />
                </div>
            )}
        </motion.div>
    );
}
