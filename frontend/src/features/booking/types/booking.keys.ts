import type { BookingPageParams } from '../types/booking.types';

/**
 * Centralized React Query key factory for the booking feature.
 *
 * Follows the same factory pattern as {@code hostelKeys} and {@code roomKeys}
 * so all three features share a consistent cache management approach.
 *
 * @example Invalidate all booking queries (e.g. after check-in):
 * ```ts
 * queryClient.invalidateQueries({ queryKey: bookingKeys.all });
 * ```
 *
 * @example Invalidate only the student's own bookings:
 * ```ts
 * queryClient.invalidateQueries({ queryKey: bookingKeys.myBookings() });
 * ```
 *
 * @example Invalidate a specific booking detail:
 * ```ts
 * queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
 * ```
 */
export const bookingKeys = {
    /** Root key — matches every booking query. */
    all: ['bookings'] as const,

    /** Matches all list-type queries. */
    lists: () => [...bookingKeys.all, 'list'] as const,

    /**
     * Student's own booking history.
     * Parameterised so different paginations are cached independently.
     */
    myBookings: (params: BookingPageParams = {}) =>
        [...bookingKeys.lists(), 'my', params] as const,

    /**
     * Manager's PENDING bookings queue — FIFO, oldest first.
     * Parameterised for pagination.
     */
    pendingBookings: (params: BookingPageParams = {}) =>
        [...bookingKeys.lists(), 'pending', params] as const,

    /**
     * All bookings for a specific hostel (manager/admin view).
     * Optionally filtered by {@link BookingStatus}.
     */
    hostelBookings: (hostelId: string, params: BookingPageParams = {}) =>
        [...bookingKeys.lists(), 'hostel', hostelId, params] as const,

    /** Matches all detail-type queries. */
    details: () => [...bookingKeys.all, 'detail'] as const,

    /** Single booking full detail by ID. */
    detail: (id: string) => [...bookingKeys.details(), id] as const,
} as const;
