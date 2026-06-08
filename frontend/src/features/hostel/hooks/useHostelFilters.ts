import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GenderPolicy } from '../types/hostel.types';
import type { HostelFilterValues } from '../components/HostelFilters';

// =============================================================================
// Types
// =============================================================================

interface UseHostelFiltersReturn {
    /** Current filter values read from URL search params. */
    filters: HostelFilterValues;
    /** Current zero-based page number. */
    page: number;
    /** Update one or more filter values and reset page to 0. */
    setFilters: (values: HostelFilterValues) => void;
    /** Navigate to a specific page. */
    setPage: (page: number) => void;
    /** Build the params object to pass to the API hook. */
    apiParams: {
        search?: string;
        genderPolicy?: string;
        page: number;
        size: number;
    };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Manages hostel list filter state synchronized with URL search params.
 *
 * Storing state in the URL gives us:
 *  - Shareable filtered URLs (e.g. `/hostels?genderPolicy=MALE_ONLY`).
 *  - Correct browser back/forward navigation.
 *  - Filters that survive a page refresh.
 *
 * Used by {@link HostelsPage} and {@link AdminHostelsPage}.
 *
 * @param pageSize - Number of items per page (defaults to 10 for students, 20 for admin).
 */
export function useHostelFilters(pageSize = 10): UseHostelFiltersReturn {
    const [searchParams, setSearchParams] = useSearchParams();

    // Read current state from URL
    const search = searchParams.get('search') ?? '';
    const genderPolicy = (searchParams.get('genderPolicy') ?? 'ALL') as
        | GenderPolicy
        | 'ALL';
    const page = Math.max(0, Number(searchParams.get('page') ?? '0'));

    const filters: HostelFilterValues = { search, genderPolicy };

    /** Write filter values back to the URL, always resetting page to 0. */
    const setFilters = useCallback(
        (values: HostelFilterValues) => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (values.search) {
                    next.set('search', values.search);
                } else {
                    next.delete('search');
                }
                if (values.genderPolicy !== 'ALL') {
                    next.set('genderPolicy', values.genderPolicy);
                } else {
                    next.delete('genderPolicy');
                }
                // Reset to page 0 whenever filters change
                next.delete('page');
                return next;
            });
        },
        [setSearchParams]
    );

    /** Navigate to a specific zero-based page number. */
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

    /**
     * API params object — pass directly to {@code useActiveHostels} or
     * {@code useAdminHostels}. Omits undefined fields so the API
     * doesn't receive empty string params.
     */
    const apiParams = {
        ...(search && { search }),
        ...(genderPolicy !== 'ALL' && { genderPolicy }),
        page,
        size: pageSize,
    };

    return { filters, page, setFilters, setPage, apiParams };
}
