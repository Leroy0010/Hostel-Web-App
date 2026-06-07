import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { hostelKeys } from '../types/hostel.keys';
import {
    activateHostel,
    assignManager,
    createHostel,
    deactivateHostel,
    fetchActiveHostels,
    fetchAllHostelsAdmin,
    fetchHostelById,
    fetchHostelsByManager,
    fetchMyHostels,
    managerUpdateHostel,
    unassignManager,
    updateHostel,
} from '../api/hostel.api';
import type {
    AssignManagerPayload,
    CreateHostelPayload,
    HostelDto,
    HostelPageParams,
    UpdateHostelPayload,
} from '../types/hostel.types';
import type { ApiError } from '@/types/api';

// =============================================================================
// Query hooks — read operations
// =============================================================================

/**
 * Paginated list of active hostels (public/student view).
 *
 * @param params - Page, size, sort parameters.
 */
export function useActiveHostels(params: HostelPageParams = {}) {
    return useQuery({
        queryKey: hostelKeys.publicList(params),
        queryFn: () => fetchActiveHostels(params),
        staleTime: 2 * 60 * 1000, // 2 minutes — hostel list changes infrequently
        placeholderData: keepPreviousData, // Keep previous page visible while next loads
    });
}

/**
 * Single hostel detail by ID.
 *
 * @param id - Hostel UUID. Pass `null` or `undefined` to disable the query.
 */
export function useHostelDetail(id: string | null | undefined) {
    return useQuery({
        queryKey: hostelKeys.detail(id ?? ''),
        queryFn: () => fetchHostelById(id!),
        enabled: Boolean(id),
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Admin: all hostels including inactive ones.
 *
 * @param params - Page, size, sort parameters.
 */
export function useAdminHostels(params: HostelPageParams = {}) {
    return useQuery({
        queryKey: hostelKeys.adminList(params),
        queryFn: () => fetchAllHostelsAdmin(params),
        staleTime: 60 * 1000, // 1 minute
        placeholderData: keepPreviousData,
    });
}

/**
 * Admin: hostels belonging to a specific manager.
 *
 * @param managerId - Manager UUID. Query is disabled if null/undefined.
 * @param params    - Pagination parameters.
 */
export function useHostelsByManager(
    managerId: string | null | undefined,
    params: HostelPageParams = {}
) {
    return useQuery({
        queryKey: hostelKeys.byManager(managerId ?? '', params),
        queryFn: () => fetchHostelsByManager(managerId!, params),
        enabled: Boolean(managerId),
        staleTime: 60 * 1000,
        placeholderData: keepPreviousData,
    });
}

/**
 * Manager: the currently authenticated manager's own hostels.
 *
 * @param params - Pagination parameters.
 */
export function useMyHostels(params: HostelPageParams = {}) {
    return useQuery({
        queryKey: hostelKeys.managerList('me', params),
        queryFn: () => fetchMyHostels(params),
        staleTime: 60 * 1000,
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// Mutation hooks — write operations
// =============================================================================

/**
 * Admin: creates a new hostel.
 *
 * On success:
 *  - Invalidates all hostel list caches so lists refresh automatically.
 *  - Caller can optionally pass `onSuccess` for navigation or dialog close.
 */
export function useCreateHostel() {
    const queryClient = useQueryClient();

    return useMutation<HostelDto, ApiError, CreateHostelPayload>({
        mutationFn: createHostel,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Hostel created successfully.');
        },
        onError: (err) => {
            // Validation errors are handled field-by-field in the form;
            // other errors show a toast from the Axios interceptor. We only
            // add a fallback here for non-validation failures that slip through.
            if (err.code !== 'VALIDATION_FAILED') {
                toast.error(err.message ?? 'Failed to create hostel.');
            }
        },
    });
}

/**
 * Admin/Manager: updates a hostel.
 *
 * On success invalidates both the specific detail cache and all list caches.
 *
 * @param hostelId - The hostel being updated (used for targeted invalidation).
 * @param isManager - When true, calls the manager-scoped update endpoint.
 */
export function useUpdateHostel(hostelId: string, isManager = false) {
    const queryClient = useQueryClient();

    return useMutation<HostelDto, ApiError, UpdateHostelPayload>({
        mutationFn: (payload) =>
            isManager
                ? managerUpdateHostel(hostelId, payload)
                : updateHostel(hostelId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: hostelKeys.detail(hostelId),
            });
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Hostel updated successfully.');
        },
    });
}

/**
 * Admin: assigns a manager to a hostel.
 */
export function useAssignManager(hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<HostelDto, ApiError, AssignManagerPayload>({
        mutationFn: (payload) => assignManager(hostelId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: hostelKeys.detail(hostelId),
            });
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Manager assigned successfully.');
        },
    });
}

/**
 * Admin: removes the manager from a hostel.
 */
export function useUnassignManager(hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<HostelDto, ApiError, void>({
        mutationFn: () => unassignManager(hostelId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: hostelKeys.detail(hostelId),
            });
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Manager removed from hostel.');
        },
    });
}

/**
 * Admin: deactivates (soft-deletes) a hostel.
 */
export function useDeactivateHostel() {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: deactivateHostel,
        onSuccess: (_, hostelId) => {
            queryClient.invalidateQueries({
                queryKey: hostelKeys.detail(hostelId),
            });
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Hostel deactivated.');
        },
    });
}

/**
 * Admin: re-activates a deactivated hostel.
 */
export function useActivateHostel() {
    const queryClient = useQueryClient();

    return useMutation<HostelDto, ApiError, string>({
        mutationFn: activateHostel,
        onSuccess: (_, hostelId) => {
            queryClient.invalidateQueries({
                queryKey: hostelKeys.detail(hostelId),
            });
            queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
            toast.success('Hostel activated.');
        },
    });
}
