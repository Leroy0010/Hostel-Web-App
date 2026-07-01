import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    activateUser,
    createStaff,
    deactivateUser,
    fetchUsers,
} from '../api/user-management.api';
import { userManagementKeys } from '../types/user-amanagement.keys';
import type {
    CreateStaffPayload,
    UserListParams,
} from '../types/user-management.types';

/**
 * Paginated, filterable list of all users — admin only.
 *
 * Maps to: {@code GET /api/admin/users}
 *
 * @param params - Role filter, search text, active-status filter, pagination.
 */
export function useUsers(params: UserListParams = {}) {
    return useQuery({
        queryKey: userManagementKeys.list(params),
        queryFn: () => fetchUsers(params),
    });
}

/**
 * Creates a new MANAGER or ADMIN staff account.
 *
 * On success:
 *  - Invalidates the user list so the new account appears immediately.
 *  - Shows a success toast.
 *
 * Maps to: {@code POST /api/admin/users}
 */
export function useCreateStaff() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateStaffPayload) => createStaff(payload),
        onSuccess: (created) => {
            queryClient.invalidateQueries({
                queryKey: userManagementKeys.lists(),
            });
            toast.success(
                `${created.role === 'ADMIN' ? 'Admin' : 'Manager'} account created. An activation email has been sent.`
            );
        },
        onError: () => {
            toast.error('Failed to create account. Please try again.');
        },
    });
}

/**
 * Soft-deactivates a user account.
 *
 * Maps to: {@code PATCH /api/admin/users/{id}/deactivate}
 */
export function useDeactivateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId: string) => deactivateUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: userManagementKeys.lists(),
            });
            toast.success('User account deactivated.');
        },
        onError: () => {
            toast.error('Failed to deactivate account. Please try again.');
        },
    });
}

/**
 * Re-activates a previously deactivated user account.
 *
 * Maps to: {@code PATCH /api/admin/users/{id}/activate}
 */
export function useActivateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId: string) => activateUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: userManagementKeys.lists(),
            });
            toast.success('User account activated.');
        },
        onError: () => {
            toast.error('Failed to activate account. Please try again.');
        },
    });
}
