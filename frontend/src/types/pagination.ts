/**
 * Spring Data {@code Page<T>} response shape.
 *
 * The Axios interceptor unwraps {@code ApiResponse.data}, giving us the raw
 * Spring Page object. We type it explicitly so React Query hooks are
 * fully typed without casting.
 *
 * @template T - The content item type (e.g. {@link HostelSummaryDto}).
 */
export interface PageResponse<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
        sort: { sorted: boolean; unsorted: boolean; empty: boolean };
    };
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
    numberOfElements: number;
    size: number;
    number: number;
    empty: boolean;
}

/**
 * Common pagination parameters used in API requests.
 *
 * Designed to align with Spring Data pagination conventions.
 */
export interface PaginationParams {
    /**
     * Zero-based page index
     * @example 0
     */
    page?: number;

    /**
     * Number of records per page
     * @example 10
     */
    size?: number;

    /**
     * Sorting criteria in the format:
     * `field,asc` or `field,desc`
     *
     * @example "createdAt,desc"
     */
    sort?: string;
}
