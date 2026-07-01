import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { BookingPageParams, BookingStatus } from '../types/booking.types';

// =============================================================================
// Types
// =============================================================================

export interface BookingFilterValues {
    /** Filter by booking status. 'ALL' means no status filter applied. */
    status: BookingStatus | 'ALL';
}

interface UseBookingFiltersReturn {
    filters: BookingFilterValues;
    page: number;
    setFilters: (values: BookingFilterValues) => void;
    setPage: (page: number) => void;
    /** Ready-to-pass params for booking list hooks. */
    apiParams: BookingPageParams;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Manages booking list filter state synchronized with URL search params.
 *
 * Used on {@link StudentBookingsPage} and {@link ManagerHostelBookingsPage}.
 * Storing state in the URL provides shareability, refresh persistence, and
 * correct browser back/forward behaviour — the same pattern used by
 * {@link useHostelFilters} and {@link useRoomFilters}.
 *
 * @param pageSize - Items per page (default: 10).
 */
export function useBookingFilters(pageSize = 10): UseBookingFiltersReturn {
    const [searchParams, setSearchParams] = useSearchParams();

    const status = (searchParams.get('status') ?? 'ALL') as
        | BookingStatus
        | 'ALL';
    const page = Math.max(0, Number(searchParams.get('page') ?? '0'));

    const filters: BookingFilterValues = { status };

    /** Update filter values and reset page to 0. */
    const setFilters = useCallback(
        (values: BookingFilterValues) => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (values.status !== 'ALL') {
                    next.set('status', values.status);
                } else {
                    next.delete('status');
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

    const apiParams: BookingPageParams = {
        page,
        size: pageSize,
        ...(status !== 'ALL' && { status: status as BookingStatus }),
    };

    return { filters, page, setFilters, setPage, apiParams };
}
