import { apiClient } from '@/lib/axios';
import type {
    AmenityPayload,
    AllRoomsParams,
    AvailableRoomsParams,
    CreateRoomPayload,
    RoomDto,
    RoomSummaryDto,
    RoomStatus,
    UpdateRoomPayload,
} from '../types/room.types';
import type { PageResponse } from '@/types/pagination';

/**
 * Raw API call functions for the room domain.
 *
 * All functions are pure async — no React Query coupling.
 * Consumed by the React Query hooks in {@code room.hooks.ts}.
 *
 * The Axios response interceptor strips the {@code ApiResponse<T>} envelope,
 * so each function receives domain data directly.
 */

// =============================================================================
// Student / Public reads
// =============================================================================

/**
 * Fetches available rooms for a hostel with optional type and price filters.
 *
 * Maps to: {@code GET /api/hostels/{hostelId}/rooms}
 *
 * @param hostelId - UUID of the parent hostel.
 * @param params   - Optional filter and pagination parameters.
 */
export function fetchAvailableRooms(
    hostelId: string,
    params: AvailableRoomsParams = {}
): Promise<PageResponse<RoomSummaryDto>> {
    return apiClient.get(`/hostels/${hostelId}/rooms`, {
        params: {
            ...(params.roomType && { roomType: params.roomType }),
            ...(params.maxPrice && { maxPrice: params.maxPrice }),
            page: params.page ?? 0,
            size: params.size ?? 12,
            sort: 'pricePerSemester,asc',
        },
    });
}

/**
 * Fetches a small preview slice of available rooms for the horizontal scroll strip.
 * Capped at 6 items — never triggers pagination UI.
 *
 * Maps to: {@code GET /api/hostels/{hostelId}/rooms} (size=6)
 *
 * @param hostelId - UUID of the parent hostel.
 */
export function fetchRoomPreview(
    hostelId: string
): Promise<PageResponse<RoomSummaryDto>> {
    return apiClient.get(`/hostels/${hostelId}/rooms`, {
        params: { page: 0, size: 6, sort: 'pricePerSemester,asc' },
    });
}

/**
 * Fetches the full detail of a single room including amenities.
 *
 * Maps to: {@code GET /api/rooms/{id}}
 *
 * @param id - Room UUID.
 */
export function fetchRoomById(id: string): Promise<RoomDto> {
    return apiClient.get(`/rooms/${id}`);
}

// =============================================================================
// Manager / Admin reads
// =============================================================================

/**
 * Manager/Admin: fetches all rooms in a hostel (includes non-available statuses).
 *
 * Maps to: {@code GET /api/manager/hostels/{hostelId}/rooms}
 *
 * @param hostelId - UUID of the parent hostel.
 * @param params   - Pagination parameters.
 */
export function fetchAllRooms(
    hostelId: string,
    params: AllRoomsParams = {}
): Promise<PageResponse<RoomSummaryDto>> {
    return apiClient.get(`/manager/hostels/${hostelId}/rooms`, {
        params: {
            page: params.page ?? 0,
            size: params.size ?? 20,
            sort: 'roomNumber,asc',
        },
    });
}

// =============================================================================
// Manager / Admin writes
// =============================================================================

/**
 * Creates a new room inside a hostel.
 *
 * Maps to: {@code POST /api/manager/hostels/{hostelId}/rooms}
 *
 * @param hostelId - UUID of the parent hostel.
 * @param payload  - Validated room creation payload.
 */
export function createRoom(
    hostelId: string,
    payload: CreateRoomPayload
): Promise<RoomDto> {
    return apiClient.post(`/manager/hostels/${hostelId}/rooms`, payload);
}

/**
 * Updates a room (patch semantics — null fields ignored server-side).
 *
 * Maps to: {@code PUT /api/manager/rooms/{id}}
 *
 * @param id      - Room UUID.
 * @param payload - Partial update payload.
 */
export function updateRoom(
    id: string,
    payload: UpdateRoomPayload
): Promise<RoomDto> {
    return apiClient.put(`/manager/rooms/${id}`, payload);
}

/**
 * Changes the operational status of a room (e.g. UNDER_MAINTENANCE).
 *
 * Maps to: {@code PATCH /api/manager/rooms/{id}/status}
 *
 * @param id     - Room UUID.
 * @param status - Target {@link RoomStatus}.
 */
export function updateRoomStatus(
    id: string,
    status: RoomStatus
): Promise<RoomDto> {
    return apiClient.patch(`/manager/rooms/${id}/status`, { status });
}

/**
 * Permanently deletes a room.
 *
 * Maps to: {@code DELETE /api/manager/rooms/{id}}
 *
 * @param id - Room UUID.
 */
export function deleteRoom(id: string): Promise<void> {
    return apiClient.delete(`/manager/rooms/${id}`);
}

// =============================================================================
// Amenity management
// =============================================================================

/**
 * Replaces ALL amenities on a room with the supplied list.
 * Existing amenities are removed before the new list is persisted.
 *
 * Maps to: {@code PUT /api/manager/rooms/{id}/amenities}
 *
 * @param id       - Room UUID.
 * @param amenities - Complete replacement amenity list.
 */
export function replaceAmenities(
    id: string,
    amenities: AmenityPayload[]
): Promise<RoomDto> {
    return apiClient.put(`/manager/rooms/${id}/amenities`, amenities);
}

/**
 * Adds a single amenity to a room without removing existing ones.
 *
 * Maps to: {@code POST /api/manager/rooms/{id}/amenities}
 *
 * @param id      - Room UUID.
 * @param amenity - The amenity to add.
 */
export function addAmenity(
    id: string,
    amenity: AmenityPayload
): Promise<RoomDto> {
    return apiClient.post(`/manager/rooms/${id}/amenities`, amenity);
}

/**
 * Removes a single amenity by its own UUID.
 *
 * Maps to: {@code DELETE /api/manager/amenities/{amenityId}}
 *
 * @param amenityId - UUID of the amenity record to remove.
 */
export function deleteAmenity(amenityId: string): Promise<void> {
    return apiClient.delete(`/manager/amenities/${amenityId}`);
}
