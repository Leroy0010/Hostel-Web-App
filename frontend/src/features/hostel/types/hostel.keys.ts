import type {
    HostelDetailParams,
    HostelPageParams,
    HostelSectionParams,
} from '../types/hostel.types';

/**
 * Centralized React Query key factory for the hostel feature.
 *
 * Using a factory pattern gives us:
 *  - Type safety on all key parameters.
 *  - Easy partial invalidation (e.g. invalidate all hostel lists at once).
 *  - A single source of truth — changing a key here propagates everywhere.
 *
 * @example Invalidate every hostel list after a mutation:
 * ```ts
 * queryClient.invalidateQueries({ queryKey: hostelKeys.lists() });
 * ```
 *
 * @example Invalidate a specific hostel detail:
 * ```ts
 * queryClient.invalidateQueries({ queryKey: hostelKeys.detail(id) });
 * ```
 */
export const hostelKeys = {
    /** Root key — matches any hostel query when used with `invalidateQueries`. */
    all: ['hostels'] as const,

    /** Matches all list-type queries (public list, admin list, manager list). */
    lists: () => [...hostelKeys.all, 'list'] as const,

    /**
     * Public paginated hostel-with-rooms sections list.
     * Used by the student discovery page (Netflix-style layout).
     * Maps to {@code GET /api/hostels/with-room-sections}.
     */
    sections: (params: HostelSectionParams) =>
        [...hostelKeys.lists(), 'sections', params] as const,

    /** Public paginated list of active hostels (summary, no rooms). */
    publicList: (params: HostelPageParams) =>
        [...hostelKeys.lists(), 'public', params] as const,

    /** All active hostels (used by map page — large page size). */
    active: () => [...hostelKeys.lists(), 'active'] as const,

   

    /** Admin paginated list of all hostels (incl. inactive). */
    adminList: (params: HostelPageParams) =>
        [...hostelKeys.lists(), 'admin', params] as const,

    /** Manager's own assigned hostels. */
    managerList: (managerId: string, params: HostelPageParams) =>
        [...hostelKeys.lists(), 'manager', managerId, params] as const,

    /** Admin: hostels assigned to a specific manager. */
    byManager: (managerId: string, params: HostelPageParams) =>
        [...hostelKeys.lists(), 'byManager', managerId, params] as const,

    /** Matches all detail-type queries. */
    details: () => [...hostelKeys.all, 'detail'] as const,

    /**
     * Single hostel detail by ID — now includes paginated rooms.
     * Maps to {@code GET /api/hostels/{id}} → {@code HostelDetailsResponseDto}.
     * The detail params (roomType, maxPrice, page, size) are part of the key
     * so room filter/pagination changes trigger a fresh fetch automatically.
     */
    detail: (id: string, params?: HostelDetailParams) =>
        [...hostelKeys.details(), id, params ?? {}] as const,
} as const;
