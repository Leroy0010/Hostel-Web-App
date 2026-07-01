import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notification.api';
import type { PaginationParams } from '@/types/pagination';
import { toast } from 'sonner';
import { notificationKeys } from '../types/notification.keys';

export const useNotificationFeed = (
    params: PaginationParams = { page: 0, size: 20 }
) => {
    return useQuery({
        queryKey: notificationKeys.list(params),
        queryFn: () => notificationApi.getNotifications(params),
        staleTime: 0,
    });
};

export const useUnreadCount = (enabled?: boolean) => {
    return useQuery({
        queryKey: notificationKeys.unreadCount(),
        queryFn: () => notificationApi.getUnreadCount(),
        refetchInterval: 60_000, // Optional fallback polling just in case WS drops 
        enabled: enabled,
    });
};

export const useMarkAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationApi.markAsRead,
        onSuccess: () => {
            // Invalidate to refresh feed and badge
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        },
        onError: () => toast.error('Failed to update notification'),
    });
};

export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationApi.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
            toast.success('All notifications marked as read');
        },
    });
};
