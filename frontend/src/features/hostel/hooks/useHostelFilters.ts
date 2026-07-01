import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GenderPolicy, HostelSectionParams } from '../types/hostel.types';
import type { HostelFilterValues } from '../components/HostelFilters';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Manages hostel filter state for the student discovery page.
 *
 * Syncs search and gender policy to URL search params so filters survive
 * page refresh and can be bookmarked or shared.
 *
 * Produces a {@link HostelSectionParams} object ready to pass to
 * {@link useHostelSections} — the new single-call sections endpoint.
 *
 * @param pageSize - Number of hostel sections per page (default 8).
 * @returns Filter values, page index, setters, and the ready-to-use API params.
 *
 * @example
 * ```tsx
 * const { filters, page, setFilters, setPage, apiParams } = useHostelFilters(8);
 * const { data } = useHostelSections(apiParams);
 * ```
 */
export function useHostelFilters(pageSize = 8) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [page, setPageState] = useState(0);

    // Read filters from URL params so they survive refresh
    const filters: HostelFilterValues = {
        search: searchParams.get('search') ?? '',
        genderPolicy:
            (searchParams.get('genderPolicy') as GenderPolicy | 'ALL') ?? 'ALL',
    };

    /** Update filter values and reset page to 0. */
    const setFilters = useCallback(
        (next: HostelFilterValues) => {
            setPageState(0);
            setSearchParams(
                (prev) => {
                    const updated = new URLSearchParams(prev);
                    if (next.search) {
                        updated.set('search', next.search);
                    } else {
                        updated.delete('search');
                    }
                    if (next.genderPolicy && next.genderPolicy !== 'ALL') {
                        updated.set('genderPolicy', next.genderPolicy);
                    } else {
                        updated.delete('genderPolicy');
                    }
                    return updated;
                },
                { replace: true }
            );
        },
        [setSearchParams]
    );

    /** Change the page index without resetting filters. */
    const setPage = useCallback((nextPage: number) => {
        setPageState(nextPage);
    }, []);

    const debouncedSearch = useDebounce(filters.search, 400);

    /**
     * Ready-to-use params for {@link useHostelSections}.
     * The 'ALL' sentinel is handled inside {@link fetchHostelSections}
     * where it is converted to undefined before the HTTP call.
     */
    const apiParams: HostelSectionParams = {
        search: debouncedSearch || undefined,
        genderPolicy: filters.genderPolicy,
        page,
        size: pageSize,
    };

    return { filters, page, setFilters, setPage, apiParams };
}
