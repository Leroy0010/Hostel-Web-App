import type { RoomType } from '@/features/room/types/room.types';
import type {
    ManagerWaitlistParams,
    WaitlistPageParams,
} from './waitlist.types';
import type { Semester } from '@/features/booking/types/booking.types';

/**
 * Centralized React Query key factory for the waitlist feature.
 *
 * Key hierarchy:
 * ```
 * ['waitlists']
 *   └── ['waitlists', 'my', params]           → student's own entries
 *   └── ['waitlists', 'status', hostelId, ...] → student position check
 *   └── ['waitlists', 'manager', hostelId, params] → manager queue view
 * ```
 *
 * @example Invalidate a student's entire waitlist after joining or leaving:
 * ```ts
 * queryClient.invalidateQueries({ queryKey: waitlistKeys.my() });
 * ```
 *
 * @example Invalidate a specific status check:
 * ```ts
 * queryClient.invalidateQueries({ queryKey: waitlistKeys.status(hostelId, ...) });
 * ```
 */
export const waitlistKeys = {
    /** Root — matches any waitlist query. */
    all: ['waitlists'] as const,

    availablePeriods: (hostelId: string, roomType: RoomType) => [...waitlistKeys.all, 'available-periods', hostelId, roomType] as const,

    // ---------------------------------------------------------------------------
    // Student keys
    // ---------------------------------------------------------------------------

    /** All "my waitlist" queries (any pagination variant). */
    myAll: () => [...waitlistKeys.all, 'my'] as const,

    /**
     * Paginated list of the student's own waitlist entries.
     * Maps to {@code GET /api/waitlists/my}.
     */
    my: (params: WaitlistPageParams) =>
        [...waitlistKeys.myAll(), params] as const,

    /** All status queries (any hostel). */
    statuses: () => [...waitlistKeys.all, 'status'] as const,

    /**
     * Queue position status for a specific hostel + room type + period.
     * Maps to {@code GET /api/waitlists/status/{hostelId}}.
     */
    status: (
        hostelId: string,
        roomType: RoomType,
        academicYear: string,
        semester: Semester
    ) =>
        [
            ...waitlistKeys.statuses(),
            hostelId,
            roomType,
            academicYear,
            semester,
        ] as const,

    // ---------------------------------------------------------------------------
    // Manager keys
    // ---------------------------------------------------------------------------

    /** All manager waitlist queries (any hostel). */
    managerAll: () => [...waitlistKeys.all, 'manager'] as const,

    /**
     * Paginated manager view of a hostel's waitlist queue.
     * Maps to {@code GET /api/manager/hostels/{hostelId}/waitlist}.
     */
    manager: (hostelId: string, params: ManagerWaitlistParams) =>
        [...waitlistKeys.managerAll(), hostelId, params] as const,
} as const;
