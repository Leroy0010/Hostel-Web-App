import { useCallback, useState } from 'react';
import type { HostelDetailParams } from '@/features/hostel/types/hostel.types';
import { useDebounce } from '@/hooks/useDebounce';

/** Room type option — 'ALL' is a UI sentinel (maps to no filter on the backend). */
export type RoomTypeFilter = 'ALL' | 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD';

/**
 * Current filter values for the room list on the hostel detail page.
 * These drive the {@link RoomFilterBar} controlled component.
 */
export interface RoomFilterValues {
    roomType: RoomTypeFilter;
    /** Max price per semester as a string (from the number input). Empty string = no filter. */
    maxPrice: string;
}

/**
 * Manages room filter + pagination state for the hostel detail page.
 *
 * Kept in local React state (not URL params) because room filters are
 * secondary to the hostel URL — the hostel ID is already the URL segment.
 *
 * Produces a {@link HostelDetailParams} object ready to pass to
 * {@link useHostelDetail} — which fetches hostel + rooms in one call.
 *
 * @param pageSize - Number of rooms per page (default 12).
 * @returns Filter values, page index, setters, and the ready-to-use API params.
 *
 * @example
 * ```tsx
 * const { filters, page, setFilters, setPage, apiParams } = useRoomFilters(12);
 * const { data } = useHostelDetail(hostelId, apiParams);
 * // data.hostel  → HostelDto
 * // data.rooms   → Page<RoomDisplayDto>
 * ```
 */
export function useRoomFilters(pageSize = 12) {
    const [page, setPageState] = useState(0);
    const [filters, setFiltersState] = useState<RoomFilterValues>({
        roomType: 'ALL',
        maxPrice: '',
    });

    /** Update filter values and reset pagination to page 0. */
    const setFilters = useCallback((next: RoomFilterValues) => {
        setFiltersState(next);
        setPageState(0);
    }, []);

    /** Change the page index without resetting filters. */
    const setPage = useCallback((nextPage: number) => {
        setPageState(nextPage);
    }, []);

    const debouncedMaxPrice = useDebounce(filters.maxPrice, 400);

    /**
     * Params passed directly to {@code GET /api/hostels/{id}}.
     * Sentinel values ('ALL', empty string) are stripped to undefined
     * so the backend receives clean optional params.
     */
    const apiParams: HostelDetailParams = {
        roomType: filters.roomType !== 'ALL' ? filters.roomType : undefined,
        maxPrice: debouncedMaxPrice ? Number(debouncedMaxPrice) : undefined,
        page,
        size: pageSize,
        sort: 'pricePerSemester,asc',
    };

    return { filters, page, setFilters, setPage, apiParams };
}