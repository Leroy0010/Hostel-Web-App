/**
 * Centralized React Query key factory for the dashboard feature.
 *
 * The dashboard payload is role-specific and includes live operational data
 * (pending bookings, open complaints), so it uses a short stale time and
 * should be invalidated after mutations that affect those counts.
 *
 * @example Invalidate after approving a booking (pending count changes):
 * ```ts
 * queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
 * ```
 */
export const dashboardKeys = {
    /** Root — matches any dashboard query. */
    all: ['dashboard'] as const,

    /**
     * The role-specific dashboard payload.
     * Maps to {@code GET /api/dashboard}.
     *
     * No params needed — the backend uses the JWT to determine role and scope.
     */
    data: () => [...dashboardKeys.all, 'data'] as const,
} as const;
