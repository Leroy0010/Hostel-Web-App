import { apiClient } from '@/lib/axios';
import type { PageResponse } from '@/types/pagination';
import type {
    JoinWaitlistPayload,
    ManagerWaitlistParams,
    WaitlistDto,
    WaitlistEntryDto,
    WaitlistPageParams,
    WaitlistStatusDto,
} from '../types/waitlist.types';
import type { RoomType } from '@/features/room/types/room.types';
import type { Semester } from '@/features/booking/types/booking.types';
import type { AvailablePeriodDto } from '@/features/hostel/types/hostel.types';

/**
 * Raw API call functions for the waitlist domain.
 *
 * Pure async functions with no React Query coupling.
 * The Axios interceptor in {@code src/lib/axios.ts} strips the
 * {@code ApiResponse<T>} envelope so each function receives domain data directly.
 */

// =============================================================================
// Student endpoints
// =============================================================================

/**
 * Joins the waitlist for a specific hostel, room type, and academic period.
 *
 * The queue is scoped to (hostelId, roomType, academicYear, semester).
 * Returns the student's entry with their 1-based position.
 *
 * Maps to: {@code POST /api/waitlists}
 *
 * @param payload - hostelId, roomType, academicYear, semester.
 * @throws {@code ALREADY_ON_WAITLIST} if the student is already in this queue.
 */
export function joinWaitlist(
    payload: JoinWaitlistPayload
): Promise<WaitlistDto> {
    return apiClient.post('/waitlists', payload);
}

/**
 * Removes the authenticated student from a specific waitlist queue.
 * Positions behind them shift up automatically on the backend.
 *
 * Maps to: {@code DELETE /api/waitlists/{hostelId}}
 *
 * @param hostelId - The hostel UUID path param.
 * @param payload  - roomType, academicYear, semester to identify the exact queue.
 */
export function leaveWaitlist(
    hostelId: string,
    payload: Omit<JoinWaitlistPayload, 'hostelId'>
): Promise<void> {
    return apiClient.delete(`/waitlists/${hostelId}`, { data: payload });
}

/**
 * Fetches the authenticated student's current position in a specific queue.
 *
 * Returns {@code onWaitlist: false} (not an error) when not in the queue.
 *
 * Maps to: {@code GET /api/waitlists/status/{hostelId}}
 *
 * @param hostelId    - The hostel UUID.
 * @param roomType    - The room type queue to check.
 * @param academicYear - The academic year.
 * @param semester    - The semester.
 */
export function fetchWaitlistStatus(
    hostelId: string,
    roomType: RoomType,
    academicYear: string,
    semester: Semester
): Promise<WaitlistStatusDto> {
    return apiClient.get(`/waitlists/status/${hostelId}`, {
        params: { roomType, academicYear, semester },
    });
}

/**
 * Fetches all waitlist entries for the authenticated student across all hostels
 * and periods, sorted by join date ascending (oldest first = joined first).
 *
 * Maps to: {@code GET /api/waitlists/my}
 *
 * @param params - Pagination params (page, size, sort).
 */
export function fetchMyWaitlists(
    params: WaitlistPageParams
): Promise<PageResponse<WaitlistDto>> {
    return apiClient.get('/waitlists/my', { params });
}

// =============================================================================
// Manager endpoints
// =============================================================================

/**
 * Fetches the paginated waitlist queue for a hostel.
 * Optionally filtered by roomType, academicYear, and semester.
 * Sorted by roomType then position — so the manager sees each type's queue grouped.
 *
 * Maps to: {@code GET /api/manager/hostels/{hostelId}/waitlist}
 *
 * @param hostelId - UUID of the hostel to view the waitlist for.
 * @param params   - Optional filters + pagination.
 */
export function fetchManagerWaitlist(
    hostelId: string,
    params: ManagerWaitlistParams
): Promise<PageResponse<WaitlistEntryDto>> {
    return apiClient.get(`/manager/hostels/${hostelId}/waitlist`, { params });
}

/**
 * Manager force-removes a specific waitlist entry.
 * Used for misconduct or data correction.
 * Positions after the removed entry shift up automatically.
 *
 * Maps to: {@code DELETE /api/manager/waitlists/{waitlistId}}
 *
 * @param waitlistId - UUID of the waitlist entry to remove.
 */
export function managerRemoveWaitlistEntry(waitlistId: string): Promise<void> {
    return apiClient.delete(`/manager/waitlists/${waitlistId}`);
}

export function fetchHostelWaitlistAvailablePeriods(
    hostelId: string,
    roomType: RoomType
): Promise<AvailablePeriodDto[]> {
    return apiClient.get(`hostels/${hostelId}/waitlist-periods`, {
        params: { roomType },
    });
}
