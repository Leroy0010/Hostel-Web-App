import { apiClient } from '@/lib/axios';
import type {
    AssignManagerPayload,
    CreateHostelPayload,
    HostelDto,
    HostelPageParams,
    HostelSummaryDto,
    UpdateHostelPayload,
} from '../types/hostel.types.ts';
import type { PageResponse } from '@/types/pagination.ts';

/**
 * Raw API call functions for the hostel domain.
 *
 * These are pure async functions with no React Query coupling.
 * They are consumed by the React Query hooks in {@code hostel.hooks.ts}.
 *
 * The Axios response interceptor in {@code src/lib/axios.ts} already strips
 * the {@code ApiResponse<T>} envelope, so each function receives the domain
 * data directly.
 */

// =============================================================================
// Public / Student
// =============================================================================

/**
 * Fetches a paginated list of **active** hostels.
 *
 * Maps to: {@code GET /api/hostels}
 */
export function fetchActiveHostels(
    params: HostelPageParams
): Promise<PageResponse<HostelSummaryDto>> {
    return apiClient.get('/hostels', {
        params,
    });
}

/**
 * Fetches the full detail of a single hostel by ID.
 *
 * Maps to: {@code GET /api/hostels/{id}}
 */
export function fetchHostelById(id: string): Promise<HostelDto> {
    return apiClient.get(`/hostels/${id}`);
}

// =============================================================================
// Admin
// =============================================================================

/**
 * Admin: fetches all hostels including inactive ones.
 *
 * Maps to: {@code GET /api/admin/hostels}
 */
export function fetchAllHostelsAdmin(
    params: HostelPageParams
): Promise<PageResponse<HostelSummaryDto>> {
    return apiClient.get('/admin/hostels', {
        params,
    });
}

/**
 * Admin: fetches hostels assigned to a specific manager.
 *
 * Maps to: {@code GET /api/admin/managers/{managerId}/hostels}
 */
export function fetchHostelsByManager(
    managerId: string,
    params: HostelPageParams
): Promise<PageResponse<HostelSummaryDto>> {
    return apiClient.get(`/admin/managers/${managerId}/hostels`, {
        params,
    });
}

/**
 * Admin: creates a new hostel.
 *
 * Maps to: {@code POST /api/admin/hostels}
 */
export function createHostel(payload: CreateHostelPayload): Promise<HostelDto> {
    return apiClient.post('/admin/hostels', payload);
}

/**
 * Admin: updates hostel fields (patch semantics — null fields are ignored server-side).
 *
 * Maps to: {@code PUT /api/admin/hostels/{id}}
 */
export function updateHostel(
    id: string,
    payload: UpdateHostelPayload
): Promise<HostelDto> {
    return apiClient.put(`/admin/hostels/${id}`, payload);
}

/**
 * Admin: assigns a manager to a hostel.
 *
 * Maps to: {@code POST /api/admin/hostels/{id}/manager}
 */
export function assignManager(
    hostelId: string,
    payload: AssignManagerPayload
): Promise<HostelDto> {
    return apiClient.post(`/admin/hostels/${hostelId}/manager`, payload);
}

/**
 * Admin: removes the manager from a hostel.
 *
 * Maps to: {@code DELETE /api/admin/hostels/{id}/manager}
 */
export function unassignManager(hostelId: string): Promise<HostelDto> {
    return apiClient.delete(`/admin/hostels/${hostelId}/manager`);
}

/**
 * Admin: soft-deletes (deactivates) a hostel.
 *
 * Maps to: {@code PATCH /api/admin/hostels/{id}/deactivate}
 */
export function deactivateHostel(hostelId: string): Promise<void> {
    return apiClient.patch(`/admin/hostels/${hostelId}/deactivate`);
}

/**
 * Admin: re-activates a previously deactivated hostel.
 *
 * Maps to: {@code PATCH /api/admin/hostels/{id}/activate}
 */
export function activateHostel(hostelId: string): Promise<HostelDto> {
    return apiClient.patch(`/admin/hostels/${hostelId}/activate`);
}

// =============================================================================
// Manager
// =============================================================================

/**
 * Manager: fetches the hostels assigned to the currently authenticated manager.
 *
 * Maps to: {@code GET /api/manager/hostels}
 */
export function fetchMyHostels(
    params: HostelPageParams
): Promise<PageResponse<HostelSummaryDto>> {
    return apiClient.get('/manager/hostels', {
        params,
    });
}

/**
 * Manager: updates their own hostel.
 *
 * Maps to: {@code PUT /api/manager/hostels/{id}}
 */
export function managerUpdateHostel(
    id: string,
    payload: UpdateHostelPayload
): Promise<HostelDto> {
    return apiClient.put(`/manager/hostels/${id}`, payload);
}
