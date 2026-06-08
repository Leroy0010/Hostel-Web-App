import type { PageResponse } from '@/types/pagination';

export type NotificationType =
    | 'BOOKING_APPROVED'
    | 'BOOKING_REJECTED'
    | 'BOOKING_CANCELLED'
    | 'CHECKIN_REMINDER'
    | 'WAITLIST_PROMOTED'
    | 'COMPLAINT_CREATED'
    | 'COMPLAINT_UPDATED'
    | 'GENERAL';

export interface NotificationResponse {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    entityType: string;
    entityId: string;
    navigateUrl: string;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
}

export interface PushSubscriptionPayload {
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
}

export interface UnsubscribePayload {
    endpoint: string;
}

// Extends your generic PageResponse
export type NotificationPageResponse = PageResponse<NotificationResponse>;
