import type { PaginationParams } from "@/types/pagination";

// Centralized query keys
export const notificationKeys = {
    all: ['notifications'] as const,
    lists: () => [...notificationKeys.all, 'list'] as const,
    list: (params: PaginationParams) =>
        [...notificationKeys.lists(), params] as const,
    unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};