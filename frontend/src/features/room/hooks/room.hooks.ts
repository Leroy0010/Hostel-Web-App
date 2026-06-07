import {
    useMutation,
    useQueries,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { roomKeys } from '../types/room.keys';
import {
    addAmenity,
    createRoom,
    deleteAmenity,
    deleteRoom,
    fetchAllRooms,
    fetchAvailableRooms,
    fetchRoomById,
    fetchRoomPreview,
    replaceAmenities,
    updateRoom,
    updateRoomStatus,
} from '../api/room.api';
import type {
    AmenityPayload,
    AllRoomsParams,
    AvailableRoomsParams,
    CreateRoomPayload,
    RoomDto,
    RoomStatus,
    RoomSummaryDto,
    UpdateRoomPayload,
} from '../types/room.types';
import type { ApiError } from '@/types/api';
import type { PageResponse } from '@/types/pagination';

// =============================================================================
// Query hooks
// =============================================================================

/**
 * Student-facing: paginated available rooms for a hostel with optional filters.
 *
 * Filters (roomType, maxPrice) are passed straight through to the API —
 * no client-side filtering is performed.
 *
 * @param hostelId - UUID of the parent hostel. Pass null to disable.
 * @param params   - Optional filter + pagination params.
 */
export function useAvailableRooms(
    hostelId: string | null | undefined,
    params: AvailableRoomsParams = {}
) {
    return useQuery({
        queryKey: roomKeys.available(hostelId ?? '', params),
        queryFn: () => fetchAvailableRooms(hostelId!, params),
        enabled: Boolean(hostelId),
        staleTime: 2 * 60 * 1000,
        placeholderData: (prev) => prev, // keep previous page visible during pagination
    });
}

/**
 * Fetches a small preview slice (max 6 rooms) of available rooms for a hostel.
 * Used by the horizontal room preview strip on the student hostels page.
 *
 * @param hostelId - UUID of the parent hostel. Pass null to disable.
 */
export function useRoomPreview(hostelId: string | null | undefined) {
    return useQuery({
        queryKey: roomKeys.preview(hostelId ?? ''),
        queryFn: () => fetchRoomPreview(hostelId!),
        enabled: Boolean(hostelId),
        staleTime: 3 * 60 * 1000, // Preview data can stay fresh slightly longer
    });
}

/**
 * Fetches room previews for multiple hostels in parallel using {@code useQueries}.
 *
 * This avoids the N+1 request anti-pattern on the student hostels page:
 * rather than sequentially fetching rooms per hostel, we fan out all requests
 * simultaneously and let React Query deduplicate + cache each independently.
 *
 * @param hostelIds - Array of hostel UUIDs to fetch room previews for.
 * @returns Array of query results in the same order as {@code hostelIds}.
 */
export function useRoomPreviews(hostelIds: string[]) {
    return useQueries({
        queries: hostelIds.map((hostelId) => ({
            queryKey: roomKeys.preview(hostelId),
            queryFn: () => fetchRoomPreview(hostelId),
            staleTime: 3 * 60 * 1000,
            enabled: hostelIds.length > 0,
        })),
        combine: (results) => ({
            /**
             * Map of hostelId → preview rooms (empty array while loading).
             * Components can look up rooms by hostelId without caring about index order.
             */
            previewsByHostelId: Object.fromEntries(
                hostelIds.map((id, i) => [
                    id,
                    (
                        results[i].data as
                            | PageResponse<RoomSummaryDto>
                            | undefined
                    )?.content ?? [],
                ])
            ) as Record<string, RoomSummaryDto[]>,
            isLoading: results.some((r) => r.isLoading),
        }),
    });
}

/**
 * Full room detail by ID including amenity list.
 *
 * @param id - Room UUID. Pass null/undefined to disable the query.
 */
export function useRoomDetail(id: string | null | undefined) {
    return useQuery({
        queryKey: roomKeys.detail(id ?? ''),
        queryFn: () => fetchRoomById(id!),
        enabled: Boolean(id),
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Manager/Admin: all rooms in a hostel (includes non-available statuses).
 *
 * @param hostelId - UUID of the parent hostel. Pass null to disable.
 * @param params   - Pagination parameters.
 */
export function useAllRooms(
    hostelId: string | null | undefined,
    params: AllRoomsParams = {}
) {
    return useQuery({
        queryKey: roomKeys.byHostel(hostelId ?? '', params),
        queryFn: () => fetchAllRooms(hostelId!, params),
        enabled: Boolean(hostelId),
        staleTime: 60 * 1000,
        placeholderData: (prev) => prev,
    });
}

// =============================================================================
// Mutation hooks
// =============================================================================

/**
 * Manager: creates a room inside a hostel.
 *
 * On success, invalidates all room lists for the hostel so the new room
 * appears immediately in both the student and manager views.
 *
 * @param hostelId - UUID of the parent hostel (used for cache invalidation).
 */
export function useCreateRoom(hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<RoomDto, ApiError, CreateRoomPayload>({
        mutationFn: (payload) => createRoom(hostelId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: roomKeys.byHostel(hostelId, {}),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.preview(hostelId),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.available(hostelId, {}),
            });
            toast.success('Room created successfully.');
        },
    });
}

/**
 * Manager: updates room fields (patch semantics).
 *
 * @param roomId   - UUID of the room being updated.
 * @param hostelId - UUID of the parent hostel (used for list cache invalidation).
 */
export function useUpdateRoom(roomId: string, hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<RoomDto, ApiError, UpdateRoomPayload>({
        mutationFn: (payload) => updateRoom(roomId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: roomKeys.detail(roomId),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.byHostel(hostelId, {}),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.preview(hostelId),
            });
            toast.success('Room updated.');
        },
    });
}

/**
 * Manager: changes the operational status of a room.
 *
 * @param roomId   - UUID of the room.
 * @param hostelId - UUID of the parent hostel (used for list cache invalidation).
 */
export function useUpdateRoomStatus(roomId: string, hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<RoomDto, ApiError, RoomStatus>({
        mutationFn: (status) => updateRoomStatus(roomId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: roomKeys.detail(roomId),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.byHostel(hostelId, {}),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.preview(hostelId),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.available(hostelId, {}),
            });
            toast.success('Room status updated.');
        },
    });
}

/**
 * Manager: permanently deletes a room.
 *
 * @param hostelId - UUID of the parent hostel (used for list + preview invalidation).
 */
export function useDeleteRoom(hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: (roomId) => deleteRoom(roomId),
        onSuccess: (_, roomId) => {
            queryClient.invalidateQueries({
                queryKey: roomKeys.detail(roomId),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.byHostel(hostelId, {}),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.preview(hostelId),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.available(hostelId, {}),
            });
            toast.success('Room deleted.');
        },
    });
}

/**
 * Manager: replaces ALL amenities on a room with the supplied list.
 *
 * @param roomId   - UUID of the room.
 * @param hostelId - UUID of the parent hostel.
 */
export function useReplaceAmenities(roomId: string, hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<RoomDto, ApiError, AmenityPayload[]>({
        mutationFn: (amenities) => replaceAmenities(roomId, amenities),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: roomKeys.detail(roomId),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.preview(hostelId),
            });
            toast.success('Amenities updated.');
        },
    });
}

/**
 * Manager: adds a single amenity to a room.
 *
 * @param roomId   - UUID of the room.
 * @param hostelId - UUID of the parent hostel.
 */
export function useAddAmenity(roomId: string, hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<RoomDto, ApiError, AmenityPayload>({
        mutationFn: (amenity) => addAmenity(roomId, amenity),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: roomKeys.detail(roomId),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.preview(hostelId),
            });
            toast.success('Amenity added.');
        },
    });
}

/**
 * Manager: removes a single amenity by its own UUID.
 *
 * @param roomId   - UUID of the parent room (used for detail cache invalidation).
 * @param hostelId - UUID of the parent hostel.
 */
export function useDeleteAmenity(roomId: string, hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: (amenityId) => deleteAmenity(amenityId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: roomKeys.detail(roomId),
            });
            queryClient.invalidateQueries({
                queryKey: roomKeys.preview(hostelId),
            });
            toast.success('Amenity removed.');
        },
    });
}
