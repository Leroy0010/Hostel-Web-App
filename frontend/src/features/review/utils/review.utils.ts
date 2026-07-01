/**
 * Returns the colour class for a star at a given index.
 *
 * @param index    - Zero-based star index (0–4).
 * @param rating   - The current rating value (1–5).
 * @param hovered  - The currently hovered star index (for interactive mode).
 */
export function starColorClass(
    index: number,
    rating: number,
    hovered: number | null = null
): string {
    const filled = hovered !== null ? index <= hovered : index < rating;
    return filled
        ? 'text-amber-400 dark:text-amber-300'
        : 'text-gray-200 dark:text-gray-700';
}

/**
 * Returns a human-readable descriptor for a 1–5 rating.
 *
 * @example ratingLabel(5) // → 'Excellent'
 */
export function ratingLabel(rating: number): string {
    switch (Math.round(rating)) {
        case 1:
            return 'Poor';
        case 2:
            return 'Fair';
        case 3:
            return 'Good';
        case 4:
            return 'Very Good';
        case 5:
            return 'Excellent';
        default:
            return '';
    }
}

/**
 * Formats a review's creation timestamp into a relative or absolute string.
 *
 * @param iso - ISO 8601 string.
 * @returns   e.g. "3 days ago" or "12 Jan 2025"
 */
export function reviewDateLabel(iso: string): string {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;

    return new Intl.DateTimeFormat('en-GH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

/**
 * Formats an average rating to one decimal place for display.
 *
 * @param avg - Raw average (e.g. 4.333...)
 * @returns   e.g. "4.3"
 */
export function formatAvgRating(avg: number | null): string {
    if (avg === null || avg === undefined) return '—';
    return avg.toFixed(1);
}
