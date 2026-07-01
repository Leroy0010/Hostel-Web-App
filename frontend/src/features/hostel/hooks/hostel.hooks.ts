import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    activateHostel,
    assignManager,
    createHostel,
    deactivateHostel,
    fetchActiveHostels,
    fetchAllHostelsAdmin,
    fetchHostelById,
    fetchHostelSections,
    fetchHostelsByManager,
    fetchMyHostels,
    getStudentActiveHostels,
    managerUpdateHostel,
    unassignManager,
    updateHostel,
} from '../api/hostel.api';
import { hostelKeys } from '../types/hostel.keys';
import type {
    AssignManagerPayload,
    CreateHostelPayload,
    HostelDetailParams,
    HostelDto,
    HostelPageParams,
    HostelSectionParams,
    UpdateHostelPayload,
} from '../types/hostel.types';
import type { ApiError } from '@/types/api';

// =============================================================================
// Public / Student queries
// =============================================================================

/**
 * Paginated list of active hostels (summary only).
 * Used by the admin table and campus map page.
 *
 * @param params - Pagination params forwarded to {@code GET /api/hostels}.
 */
export function useActiveHostels(params: HostelPageParams = {}) {
    return useQuery({
        queryKey: hostelKeys.publicList(params),
        queryFn: () => fetchActiveHostels(params),
        placeholderData: keepPreviousData,
    });
}

/**
 * Paginated hostel sections — each section includes the hostel summary and
 * up to 6 room previews embedded by the backend.
 *
 * Replaces the old pattern of fetching active hostels + N room-preview calls.
 * Use this hook on the student discovery page (Netflix-style layout).
 *
 * Maps to: {@code GET /api/hostels/with-room-sections}
 *
 * @param params - Search, gender policy, room type, max price, pagination.
 */
export function useHostelSections(params: HostelSectionParams) {
    return useQuery({
        queryKey: hostelKeys.sections(params),
        queryFn: () => fetchHostelSections(params),
    });
}

/**
 * Full hostel detail for the detail page — hostel info + paginated rooms in
 * a **single** API call (no second rooms fetch needed).
 *
 * The {@code params} object feeds into both the query key (so filter/page
 * changes cause a fresh fetch) and the API call itself.
 *
 * Maps to: {@code GET /api/hostels/{id}?roomType=&maxPrice=&page=&size=}
 *
 * @param id - Hostel UUID from the route params. Pass {@code undefined} while
 *             the param is not yet available — the query will be disabled.
 * @param params - Optional room filter + pagination state from {@link useRoomFilters}.
 */
export function useHostelDetail(
    id: string | undefined,
    params?: HostelDetailParams
) {
    return useQuery({
        queryKey: hostelKeys.detail(id ?? '', params),
        queryFn: () => fetchHostelById(id!, params),
        // Only run once we have a real id
        enabled: Boolean(id),
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// Admin queries
// =============================================================================

/**
 * Admin: paginated list of all hostels including inactive ones.
 *
 * Maps to: {@code GET /api/admin/hostels}
 */
export function useAdminHostels(params: HostelPageParams = {}) {
    return useQuery({
        queryKey: hostelKeys.adminList(params),
        queryFn: () => fetchAllHostelsAdmin(params),
        placeholderData: keepPreviousData,
    });
}

/**
 * Admin: paginated list of hostels assigned to a specific manager.
 *
 * Maps to: {@code GET /api/admin/managers/{managerId}/hostels}
 */
export function useHostelsByManager(
    managerId: string | undefined,
    params: HostelPageParams = {}
) {
    return useQuery({
        queryKey: hostelKeys.byManager(managerId ?? '', params),
        queryFn: () => fetchHostelsByManager(managerId!, params),
        enabled: Boolean(managerId),
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// Manager queries
// =============================================================================

/**
 * Manager: the hostels assigned to the currently authenticated manager.
 *
 * Maps to: {@code GET /api/manager/hostels}
 */
export function useMyHostels(params: HostelPageParams = {}) {
    return useQuery({
        queryKey: hostelKeys.managerList('me', params),
        queryFn: () => fetchMyHostels(params),
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// Admin mutations
// =============================================================================

/**
 * Creates a new hostel.
 *
 * On success:
 *  - Invalidates all hostel list queries so the new hostel appears immediately.
 *  - Shows a success toast.
 *
 * Maps to: {@code POST /api/admin/hostels}
 */
export function useCreateHostel() {
    const queryClient = useQueryClient();

    return useMutation<HostelDto, ApiError, CreateHostelPayload>({
        mutationFn: (payload) => createHostel(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Hostel created successfully.');
        },
        onError: () => {
            toast.error('Failed to create hostel. Please try again.');
        },
    });
}

/**
 * Updates hostel fields (admin scope).
 * Invalidates the affected detail key and list keys on success.
 *
 * Maps to: {@code PUT /api/admin/hostels/{id}}
 */
export function useUpdateHostel(id: string) {
    const queryClient = useQueryClient();

    return useMutation<HostelDto, ApiError, UpdateHostelPayload>({
        mutationFn: (payload) => updateHostel(id, payload),
        onSuccess: () => {
            // Invalidate the detail for this hostel (all param variants)
            queryClient.invalidateQueries({ queryKey: hostelKeys.details() });
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Hostel updated successfully.');
        },
        onError: () => {
            toast.error('Failed to update hostel. Please try again.');
        },
    });
}

/**
 * Assigns a manager to a hostel.
 *
 * Maps to: {@code POST /api/admin/hostels/{hostelId}/manager}
 */
export function useAssignManager(hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<HostelDto, ApiError, AssignManagerPayload>({
        mutationFn: (payload) => assignManager(hostelId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hostelKeys.details() });
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Manager assigned successfully.');
        },
        onError: (err) => {
            toast.error(
                err.message || 'Failed to assign manager. Please try again.'
            );
        },
    });
}

/**
 * Removes the manager from a hostel.
 *
 * Maps to: {@code DELETE /api/admin/hostels/{hostelId}/manager}
 */
export function useUnassignManager(hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<HostelDto, ApiError, void>({
        mutationFn: () => unassignManager(hostelId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hostelKeys.details() });
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Manager unassigned.');
        },
        onError: (err) => {
            toast.error(
                err.message || 'Failed to unassign manager. Please try again.'
            );
        },
    });
}

/**
 * Soft-deletes (deactivates) a hostel.
 *
 * Maps to: {@code PATCH /api/admin/hostels/{id}/deactivate}
 */
export function useDeactivateHostel() {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: (hostelId) => deactivateHostel(hostelId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Hostel deactivated.');
        },
        onError: (err) => {
            toast.error(
                err.message || 'Failed to deactivate hostel. Please try again.'
            );
        },
    });
}

/**
 * Re-activates a previously deactivated hostel.
 *
 * Maps to: {@code PATCH /api/admin/hostels/{id}/activate}
 */
export function useActivateHostel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (hostelId: string) => activateHostel(hostelId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Hostel activated.');
        },
        onError: () => {
            toast.error('Failed to activate hostel. Please try again.');
        },
    });
}

// =============================================================================
// Manager mutations
// =============================================================================

/**
 * Manager: updates their own hostel.
 *
 * Maps to: {@code PUT /api/manager/hostels/{id}}
 */
export function useManagerUpdateHostel(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UpdateHostelPayload) =>
            managerUpdateHostel(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hostelKeys.details() });
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Hostel updated successfully.');
        },
        onError: () => {
            toast.error('Failed to update hostel. Please try again.');
        },
    });
}

export function useGetStudentActiveHostels() {
    return useQuery({
        queryKey: hostelKeys.active(),
        queryFn: getStudentActiveHostels,
        staleTime: 60 * 1000 * 10,
        placeholderData: keepPreviousData,
    });
}
