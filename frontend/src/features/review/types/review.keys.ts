/**
 * Centralized React Query key factory for the review feature.
 *
 * @example
 * ```ts
 * // Invalidate all reviews for a hostel after a new review is submitted:
 * queryClient.invalidateQueries({ queryKey: reviewKeys.hostelFeed(hostelId) });
 *
 * // Invalidate the hostel's rating card:
 * queryClient.invalidateQueries({ queryKey: reviewKeys.hostelRating(hostelId) });
 * ```
 */
export const reviewKeys = {
    all: ['reviews'] as const,

    lists: () => [...reviewKeys.all, 'list'] as const,

    /** Student's own reviews, paginated. */
    myReviews: (params: { page?: number; size?: number } = {}) =>
        [...reviewKeys.lists(), 'my', params] as const,

    /** Paginated review feed for a specific hostel. */
    hostelFeed: (
        hostelId: string,
        params: { page?: number; size?: number } = {}
    ) => [...reviewKeys.lists(), 'hostel', hostelId, params] as const,

    details: () => [...reviewKeys.all, 'detail'] as const,

    /** Single review full detail by ID. */
    detail: (id: string) => [...reviewKeys.details(), id] as const,

    /** Aggregate rating card for a hostel. */
    hostelRating: (hostelId: string) =>
        [...reviewKeys.all, 'rating', hostelId] as const,
} as const;
