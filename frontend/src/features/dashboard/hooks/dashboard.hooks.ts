import { useQuery } from '@tanstack/react-query';
import { fetchDashboard } from '../api/dashboard.api';
import { dashboardKeys } from '../types/dashboard.keys';

/**
 * Fetches the role-specific dashboard payload for the authenticated user.
 *
 * The backend uses the JWT to determine which role variant to return:
 *  - ADMIN   → {@link AdminDashboard}   (system-wide metrics)
 *  - MANAGER → {@link ManagerDashboard} (scoped to assigned hostels)
 *  - STUDENT → {@link StudentDashboard} (personal bookings + waitlist)
 *
 * **Stale time: 60 seconds.**
 * The dashboard surfaces live operational data — pending booking counts,
 * open complaint counts, current occupancy — so we allow background
 * refetches on window focus rather than caching indefinitely. 60 s is short
 * enough to feel responsive but avoids hammering the server on every render.
 *
 * **Refetch on window focus: true (default).**
 * When a manager approves a booking in a separate tab and returns to the
 * dashboard, the pending count should reflect the change automatically.
 *
 * Maps to: {@code GET /api/dashboard}
 */
export function useDashboard(enabled?: boolean) {
    return useQuery({
        queryKey: dashboardKeys.data(),
        queryFn: fetchDashboard,
        staleTime: 60 * 1000, // 60 seconds
        refetchOnWindowFocus: true,
        enabled,
    });
}
