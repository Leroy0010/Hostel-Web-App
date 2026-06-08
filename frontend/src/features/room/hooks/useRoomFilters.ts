import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { RoomType } from '../types/room.types';

// =============================================================================
// Types
// =============================================================================

export interface RoomFilterValues {
    roomType: RoomType | 'ALL';
    maxPrice: string;
}

interface UseRoomFiltersReturn {
    filters: RoomFilterValues;
    page: number;
    setFilters: (values: RoomFilterValues) => void;
    setPage: (page: number) => void;
    /** Ready-to-pass params object for {@code useAvailableRooms}. */
    apiParams: {
        roomType?: RoomType;
        maxPrice?: string;
        page: number;
        size: number;
    };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Manages room list filter state synchronized with URL search params.
 *
 * Used on {@link HostelDetailPage} — the student-facing room list under
 * a single hostel. Filters are passed straight through to the API hook
 * without any client-side filtering logic.
 *
 * @param pageSize - Items per page (default: 12, matching backend default).
 */
export function useRoomFilters(pageSize = 12): UseRoomFiltersReturn {
    const [searchParams, setSearchParams] = useSearchParams();

    const roomType = (searchParams.get('roomType') ?? 'ALL') as
        | RoomType
        | 'ALL';
    const maxPrice = searchParams.get('maxPrice') ?? '';
    const page = Math.max(0, Number(searchParams.get('page') ?? '0'));

    const filters: RoomFilterValues = { roomType, maxPrice };

    const setFilters = useCallback(
        (values: RoomFilterValues) => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (values.roomType !== 'ALL') {
                    next.set('roomType', values.roomType);
                } else {
                    next.delete('roomType');
                }
                if (values.maxPrice) {
                    next.set('maxPrice', values.maxPrice);
                } else {
                    next.delete('maxPrice');
                }
                next.delete('page');
                return next;
            });
        },
        [setSearchParams]
    );

    const setPage = useCallback(
        (newPage: number) => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (newPage === 0) {
                    next.delete('page');
                } else {
                    next.set('page', String(newPage));
                }
                return next;
            });
        },
        [setSearchParams]
    );

    const apiParams = {
        ...(roomType !== 'ALL' && { roomType: roomType as RoomType }),
        ...(maxPrice && { maxPrice }),
        page,
        size: pageSize,
    };

    return { filters, page, setFilters, setPage, apiParams };
}
