import { apiClient } from '@/lib/axios';
import type {
    AssignManagerPayload,
    CreateHostelPayload,
    HostelDetailsResponseDto,
    HostelDto,
    HostelPageParams,
    HostelSectionDto,
    HostelSectionParams,
    HostelSummaryDto,
    UpdateHostelPayload,
} from '../types/hostel.types';
import type { PageResponse } from '@/types/pagination';

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
 * Fetches a paginated list of **active** hostels (summary only, no rooms).
 * Used by the admin hostel table and the campus map page (needs all hostels for pins).
 *
 * Maps to: {@code GET /api/hostels}
 */
export function fetchActiveHostels(
    params: HostelPageParams
): Promise<PageResponse<HostelSummaryDto>> {
    return apiClient.get('/hostels', { params });
}

/**
 * Fetches the full detail of a single hostel by ID **including** a paginated
 * room list — eliminating the need for a second API call on the detail page.
 *
 * Accepts room filter/pagination params forwarded to the backend so the
 * returned {@code rooms} page reflects the current filter state.
 *
 * Maps to: {@code GET /api/hostels/{id}?roomType=&maxPrice=&page=&size=&sort=}
 *
 * @param id - Hostel UUID.
 * @param params - Optional room filter + pagination params.
 * @returns Combined hostel detail + paginated rooms in one response.
 */
export function fetchHostelById(
    id: string,
    params?: {
        roomType?: string;
        maxPrice?: number;
        page?: number;
        size?: number;
        sort?: string;
    }
): Promise<HostelDetailsResponseDto> {
    return apiClient.get(`/hostels/${id}`, { params });
}

/**
 * Fetches paginated hostel sections — each section contains the hostel summary
 * plus up to 6 room previews (populated server-side, no N+1 requests).
 *
 * Used by the student discovery page (Netflix-style horizontal strip layout).
 *
 * Maps to: {@code GET /api/hostels/with-room-sections}
 *
 * @param params - Search, gender policy, room type, max price, and pagination.
 */
export function fetchHostelSections(
    params: HostelSectionParams
): Promise<PageResponse<HostelSectionDto>> {
    // Convert 'ALL' sentinel back to undefined so the backend receives no filter
    const { genderPolicy, ...rest } = params;
    return apiClient.get('/hostels/with-room-sections', {
        params: {
            ...rest,
            genderPolicy: genderPolicy === 'ALL' ? undefined : genderPolicy,
        },
    });
}

/**
 * Fetches all active hostels for a student (authenticated endpoint).
 * Used for booking eligibility checks and student-specific hostel views.
 *
 * Maps to: {@code GET /api/student/hostels}
 */
export function getStudentActiveHostels(): Promise<HostelSummaryDto[]> {
    return apiClient.get('/student/hostels');
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
    return apiClient.get('/admin/hostels', { params });
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
    return apiClient.get(`/admin/managers/${managerId}/hostels`, { params });
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
 * Admin: updates hostel fields (patch semantics — null fields ignored server-side).
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
    return apiClient.get('/manager/hostels', { params });
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
