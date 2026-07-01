import type { UserListParams } from '../types/user-management.types';

/**
 * Centralized React Query key factory for the admin user management feature.
 *
 * @example Invalidate the user list after creating or deactivating a user:
 * ```ts
 * queryClient.invalidateQueries({ queryKey: userManagementKeys.lists() });
 * ```
 */
export const userManagementKeys = {
    /** Root — matches any user management query. */
    all: ['user-management'] as const,

    /** Matches all list-type queries (any filter/pagination variant). */
    lists: () => [...userManagementKeys.all, 'list'] as const,

    /**
     * Paginated, filtered user list.
     * Maps to {@code GET /api/admin/users}.
     */
    list: (params: UserListParams) =>
        [...userManagementKeys.lists(), params] as const,
} as const;
