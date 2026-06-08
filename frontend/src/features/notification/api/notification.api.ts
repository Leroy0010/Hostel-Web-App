import { apiClient } from '@/lib/axios';
import type {
    NotificationPageResponse,
    PushSubscriptionPayload,
    UnsubscribePayload,
} from '../types/notification.types';
import type { PaginationParams } from '@/types/pagination';

export const notificationApi = {
    getNotifications: async (
        params?: PaginationParams
    ): Promise<NotificationPageResponse> => {
        // Axios interceptor handles unwrapping the ApiResponse envelope
        return apiClient.get('/notifications', { params });
    },

    getUnreadCount: async (): Promise<{ count: number }> => {
        return apiClient.get('/notifications/unread-count');
    },

    markAsRead: async (id: string): Promise<void> => {
        return apiClient.patch(`/notifications/${id}/read`);
    },

    markAllAsRead: async (): Promise<void> => {
        return apiClient.patch('/notifications/read-all');
    },

    deleteNotification: async (id: string): Promise<void> => {
        return apiClient.delete(`/notifications/${id}`);
    },

    getVapidKey: async (): Promise<{ publicKey: string }> => {
        return apiClient.get('/notifications/vapid-public-key');
    },

    subscribeToPush: async (
        payload: PushSubscriptionPayload
    ): Promise<void> => {
        return apiClient.post('/notifications/push/subscribe', payload);
    },

    unsubscribeFromPush: async (payload: UnsubscribePayload): Promise<void> => {
        return apiClient.delete('/notifications/push/unsubscribe', {
            data: payload,
        });
    },
};
