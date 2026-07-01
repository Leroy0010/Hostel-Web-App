import type { AllRoomsParams, AvailableRoomsParams } from '../types/room.types';

/**
 * Centralized React Query key factory for the room feature.
 *
 * Usage:
 * @example
 * // Invalidate all room caches after a mutation:
 * queryClient.invalidateQueries({ queryKey: roomKeys.all });
 *
 * // Invalidate only rooms under a specific hostel:
 * queryClient.invalidateQueries({ queryKey: roomKeys.byHostel(hostelId) });
 *
 * // Invalidate a single room detail:
 * queryClient.invalidateQueries({ queryKey: roomKeys.detail(roomId) });
 */
export const roomKeys = {
    /** Matches every room query — use for broad invalidation after batch operations. */
    all: ['rooms'] as const,

    /** Matches all list-type queries. */
    lists: () => [...roomKeys.all, 'list'] as const,

    /**
     * Student-facing available rooms for a specific hostel.
     * Parameterized so each filter combination is cached independently.
     */
    available: (hostelId: string, params: AvailableRoomsParams) =>
        [...roomKeys.lists(), 'available', hostelId, params] as const,

    availablePeriods: (roomId: string) =>
        [...roomKeys.all, 'available-periods', roomId] as const,

    active: (hostelId: string) =>
        [...roomKeys.lists(), 'active', hostelId] as const,

    /**
     * A lightweight preview fetch (first N rooms, no pagination UI).
     * Used by the horizontal room preview strip on the hostels page.
     */
    preview: (hostelId: string) =>
        [...roomKeys.lists(), 'preview', hostelId] as const,

    /** Manager/Admin: all rooms in a hostel (includes non-available statuses). */
    byHostel: (hostelId: string, params: AllRoomsParams) =>
        [...roomKeys.lists(), 'manager', hostelId, params] as const,

    /** Matches all detail-type queries. */
    details: () => [...roomKeys.all, 'detail'] as const,

    /** Single room detail by ID. */
    detail: (id: string) => [...roomKeys.details(), id] as const,
} as const;
