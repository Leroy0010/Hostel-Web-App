import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ComplaintPageParams, ComplaintStatus } from '../types/complaint.types';

// =============================================================================
// Types
// =============================================================================

export interface ComplaintFilterValues {
    /** Filter by booking status. 'ALL' means no status filter applied. */
    status: ComplaintStatus | 'ALL';
}

interface UseComplaintFiltersReturn {
    filters: ComplaintFilterValues;
    page: number;
    setFilters: (values: ComplaintFilterValues) => void;
    setPage: (page: number) => void;
    /** Ready-to-pass params for booking list hooks. */
    apiParams: ComplaintPageParams;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Manages booking list filter state synchronized with URL search params.
 *
 * Used on {@link StudentComplaintsPage} and {@link ManagerHostelComplaintsPage}.
 * Storing state in the URL provides shareability, refresh persistence, and
 * correct browser back/forward behaviour — the same pattern used by
 * {@link useHostelFilters} and {@link useRoomFilters}.
 *
 * @param pageSize - Items per page (default: 10).
 */
export function useComplaintFilters(pageSize = 10): UseComplaintFiltersReturn {
    const [searchParams, setSearchParams] = useSearchParams();

    const status = (searchParams.get('status') ?? 'ALL') as
        | ComplaintStatus
        | 'ALL';
    const page = Math.max(0, Number(searchParams.get('page') ?? '0'));

    const filters: ComplaintFilterValues = { status };

    /** Update filter values and reset page to 0. */
    const setFilters = useCallback(
        (values: ComplaintFilterValues) => {
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

    const apiParams: ComplaintPageParams = {
        page,
        size: pageSize,
        ...(status !== 'ALL' && { status: status as ComplaintStatus }),
    };

    return { filters, page, setFilters, setPage, apiParams };
}
