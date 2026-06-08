import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface PaginationProps {
    /** Zero-based current page number (matches Spring Data's Page.number). */
    currentPage: number;
    /** Total number of pages (matches Spring Data's Page.totalPages). */
    totalPages: number;
    /** Total element count — displayed as context e.g. "48 results". */
    totalElements: number;
    /** Called with the new zero-based page number when the user navigates. */
    onPageChange: (page: number) => void;
    /** Shows a loading overlay on the controls when true. */
    isLoading?: boolean;
    /** Optional className on the wrapper. */
    className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Builds the array of page numbers (and ellipsis markers) to display.
 *
 * Strategy: always show the first page, last page, the current page, and
 * one neighbour on each side. Gaps larger than 1 become an ellipsis ("…").
 *
 * @param current  - Zero-based current page index.
 * @param total    - Total page count.
 * @returns Array of numbers (page indices) and `"..."` strings.
 */
function buildPageRange(current: number, total: number): (number | '...')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i);
    }

    const pages: (number | '...')[] = [0];

    const leftEdge = Math.max(1, current - 1);
    const rightEdge = Math.min(total - 2, current + 1);

    if (leftEdge > 1) pages.push('...');

    for (let i = leftEdge; i <= rightEdge; i++) {
        pages.push(i);
    }

    if (rightEdge < total - 2) pages.push('...');

    pages.push(total - 1);
    return pages;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Pagination controls compatible with Spring Data's {@code Page<T>} response.
 *
 * Features:
 *  - Numbered page buttons with smart ellipsis truncation.
 *  - Previous / Next arrow buttons.
 *  - "{N} results" context label.
 *  - Disabled state while loading.
 *  - Full light/dark theme support.
 *
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={page}
 *   totalPages={data.totalPages}
 *   totalElements={data.totalElements}
 *   onPageChange={setPage}
 *   isLoading={isFetching}
 * />
 * ```
 */
export function Pagination({
    currentPage,
    totalPages,
    totalElements,
    onPageChange,
    isLoading = false,
    className,
}: PaginationProps) {
    // Nothing to render for a single page
    if (totalPages <= 1) return null;

    const pages = buildPageRange(currentPage, totalPages);

    return (
        <div
            className={cn(
                'flex flex-col items-center gap-3 sm:flex-row sm:justify-between',
                isLoading && 'pointer-events-none opacity-60',
                className
            )}
            aria-label="Pagination navigation"
        >
            {/* Results count */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {totalElements.toLocaleString()} result
                {totalElements !== 1 ? 's' : ''}
            </p>

            {/* Page controls */}
            <div className="flex items-center gap-1">
                {/* Previous */}
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 0 || isLoading}
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Numbered pages */}
                {pages.map((page, idx) =>
                    page === '...' ? (
                        <span
                            key={`ellipsis-${idx}`}
                            className="flex h-8 w-8 items-center justify-center text-xs text-gray-400 dark:text-gray-600"
                            aria-hidden="true"
                        >
                            …
                        </span>
                    ) : (
                        <Button
                            key={page}
                            variant="outline"
                            size="sm"
                            className={cn(
                                'h-8 min-w-8 border px-2.5 text-xs font-medium',
                                page === currentPage
                                    ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-950'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                            )}
                            onClick={() => onPageChange(page)}
                            disabled={isLoading}
                            aria-label={`Page ${page + 1}`}
                            aria-current={
                                page === currentPage ? 'page' : undefined
                            }
                        >
                            {page + 1}
                        </Button>
                    )
                )}

                {/* Next */}
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1 || isLoading}
                    aria-label="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
