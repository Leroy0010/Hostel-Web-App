import { apiClient } from '@/lib/axios';
import type { PageResponse } from '@/types/pagination';
import type {
    CreateStaffPayload,
    UserDto,
    UserListParams,
} from '../types/user-management.types';

/**
 * Raw API call functions for admin user management.
 *
 * Pure async functions with no React Query coupling. The Axios interceptor
 * strips the {@code ApiResponse<T>} envelope so each function receives
 * domain data directly.
 */

/**
 * Fetches a paginated, filterable list of all users.
 *
 * Maps to: {@code GET /api/admin/users}
 *
 * @param params - Optional role filter, search text, active-status filter,
 *                 and pagination params.
 */
export function fetchUsers(
    params: UserListParams
): Promise<PageResponse<UserDto>> {
    return apiClient.get('/admin/users', { params });
}

/**
 * Creates a new MANAGER or ADMIN staff account.
 * An activation email is sent so the staff member can set their password.
 *
 * Maps to: {@code POST /api/admin/users}
 *
 * @param payload - Staff account details including role.
 */
export function createStaff(payload: CreateStaffPayload): Promise<UserDto> {
    return apiClient.post('/admin/users', payload);
}

/**
 * Soft-deactivates a user account. The user can no longer log in.
 *
 * Maps to: {@code PATCH /api/admin/users/{id}/deactivate}
 *
 * @param userId - UUID of the user to deactivate.
 */
export function deactivateUser(userId: string): Promise<UserDto> {
    return apiClient.patch(`/admin/users/${userId}/deactivate`);
}

/**
 * Re-activates a previously deactivated user account.
 *
 * Maps to: {@code PATCH /api/admin/users/{id}/activate}
 *
 * @param userId - UUID of the user to activate.
 */
export function activateUser(userId: string): Promise<UserDto> {
    return apiClient.patch(`/admin/users/${userId}/activate`);
}
