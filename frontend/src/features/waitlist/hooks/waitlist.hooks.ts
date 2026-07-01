import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    fetchHostelWaitlistAvailablePeriods,
    fetchManagerWaitlist,
    fetchMyWaitlists,
    fetchWaitlistStatus,
    joinWaitlist,
    leaveWaitlist,
    managerRemoveWaitlistEntry,
} from '../api/waitlist.api';
import { waitlistKeys } from '../types/waitlist.keys';
import type {
    JoinWaitlistPayload,
    LeaveWaitlistPayloadType,
    ManagerWaitlistParams,
    WaitlistDto,
    WaitlistPageParams,
} from '../types/waitlist.types';
import type { RoomType } from '@/features/room/types/room.types';
import type { Semester } from '@/features/booking/types/booking.types';
import type { ApiError } from '@/types/api';

export function useGetHostelWaitlistAvailablePeriods(
    hostelId: string,
    roomType: RoomType
) {
    return useQuery({
        queryKey: waitlistKeys.availablePeriods(hostelId, roomType),
        queryFn: () => fetchHostelWaitlistAvailablePeriods(hostelId, roomType),
        staleTime: 60 * 1000 * 10,
        placeholderData: keepPreviousData,
        enabled: Boolean(hostelId && roomType),
    });
}

// =============================================================================
// Student queries
// =============================================================================

/**
 * Paginated list of the authenticated student's own waitlist entries.
 * Sorted by {@code joinedAt} ascending (oldest join = first in line conceptually).
 *
 * Maps to: {@code GET /api/waitlists/my}
 *
 * @param params - Pagination params.
 */
export function useMyWaitlists(params: WaitlistPageParams = {}) {
    return useQuery({
        queryKey: waitlistKeys.my(params),
        queryFn: () => fetchMyWaitlists(params),
        placeholderData: keepPreviousData,
    });
}

/**
 * Checks the authenticated student's position in a specific waitlist queue.
 *
 * Returns {@code onWaitlist: false} (not an error) when not in the queue.
 * Disabled when any required param is missing so it doesn't fire prematurely.
 *
 * Maps to: {@code GET /api/waitlists/status/{hostelId}}
 *
 * @param hostelId     - The hostel UUID. Pass undefined to disable.
 * @param roomType     - The room type queue to check.
 * @param academicYear - The academic year (e.g. "2025/2026").
 * @param semester     - The semester (FIRST | SECOND | FULL).
 */
export function useWaitlistStatus(
    hostelId: string | undefined,
    roomType: RoomType | undefined,
    academicYear: string | undefined,
    semester: Semester | undefined
) {
    const enabled = Boolean(hostelId && roomType && academicYear && semester);

    return useQuery({
        queryKey: enabled
            ? waitlistKeys.status(
                  hostelId!,
                  roomType!,
                  academicYear!,
                  semester!
              )
            : waitlistKeys.statuses(),
        queryFn: () =>
            fetchWaitlistStatus(hostelId!, roomType!, academicYear!, semester!),
        enabled,
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// Student mutations
// =============================================================================

/**
 * Joins the waitlist for a specific hostel, room type, and academic period.
 *
 * On success:
 *  - Invalidates the student's waitlist list (so it refreshes immediately).
 *  - Invalidates the relevant status query (position now exists).
 *  - Shows a success toast with the queue position.
 *
 * Maps to: {@code POST /api/waitlists}
 */
export function useJoinWaitlist() {
    const queryClient = useQueryClient();

    return useMutation<WaitlistDto, ApiError, JoinWaitlistPayload>({
        mutationFn: (payload: JoinWaitlistPayload) => joinWaitlist(payload),
        onSuccess: (data) => {
            // Refresh the student's full waitlist list
            queryClient.invalidateQueries({ queryKey: waitlistKeys.myAll() });
            // Refresh any open status queries for this hostel
            queryClient.invalidateQueries({
                queryKey: waitlistKeys.statuses(),
            });
            toast.success(
                `You joined the waitlist at position ${data.position}. We'll notify you when a spot opens.`
            );
        },
        onError: (error) => {
            if (error.code !== 'VALIDATION_FAILED')
                toast.error(
                    error.message ||
                        'Failed to join the waitlist. Please try again.'
                );
        },
    });
}

/**
 * Removes the authenticated student from a specific waitlist queue.
 *
 * On success:
 *  - Invalidates the student's waitlist list.
 *  - Invalidates status queries.
 *  - Shows a confirmation toast.
 *
 * Maps to: {@code DELETE /api/waitlists/{hostelId}}
 */
export function useLeaveWaitlist() {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, LeaveWaitlistPayloadType>({
        mutationFn: ({ hostelId, payload }) => leaveWaitlist(hostelId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: waitlistKeys.myAll() });
            queryClient.invalidateQueries({
                queryKey: waitlistKeys.statuses(),
            });
            toast.success('You have been removed from the waitlist.');
        },
        onError: (err) => {
            toast.error(
                err.message || 'Failed to leave the waitlist. Please try again.'
            );
        },
    });
}

// =============================================================================
// Manager queries
// =============================================================================

/**
 * Paginated waitlist queue for a hostel (manager view).
 * Optionally filtered by roomType, academicYear, and semester.
 * Sorted by roomType then position.
 *
 * Maps to: {@code GET /api/manager/hostels/{hostelId}/waitlist}
 *
 * @param hostelId - The hostel UUID. Pass undefined to disable the query.
 * @param params   - Optional filters and pagination.
 */
export function useManagerWaitlist(
    hostelId: string | undefined,
    params: ManagerWaitlistParams = {}
) {
    return useQuery({
        queryKey: waitlistKeys.manager(hostelId ?? '', params),
        queryFn: () => fetchManagerWaitlist(hostelId!, params),
        enabled: Boolean(hostelId),
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// Manager mutations
// =============================================================================

/**
 * Force-removes a specific waitlist entry (manager action).
 * Used for misconduct or data correction.
 *
 * On success:
 *  - Invalidates all manager waitlist queries for re-fetch.
 *  - Shows a confirmation toast.
 *
 * Maps to: {@code DELETE /api/manager/waitlists/{waitlistId}}
 */
export function useManagerRemoveWaitlistEntry() {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: (waitlistId: string) =>
            managerRemoveWaitlistEntry(waitlistId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: waitlistKeys.managerAll(),
            });
            toast.success('Waitlist entry removed.');
        },
        onError: (err) => {
            toast.error(
                err.message ||
                    'Failed to remove waitlist entry. Please try again.'
            );
        },
    });
}
