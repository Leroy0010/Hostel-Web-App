import type { RoomStatus, RoomType } from '../types/room.types';

// =============================================================================
// Room type helpers
// =============================================================================

/**
 * Human-readable label for each room type.
 *
 * @example
 * roomTypeLabel('SINGLE') // → 'Single'
 */
export function roomTypeLabel(type: RoomType): string {
    const labels: Record<RoomType, string> = {
        SINGLE: 'Single',
        DOUBLE: 'Double',
        TRIPLE: 'Triple',
        QUAD: 'Quad',
    };
    return labels[type] ?? type;
}

/**
 * Tailwind color classes for each room type badge.
 */
export function roomTypeColors(type: RoomType): {
    bg: string;
    text: string;
    border: string;
} {
    switch (type) {
        case 'SINGLE':
            return {
                bg: 'bg-violet-50 dark:bg-violet-950/30',
                text: 'text-violet-700 dark:text-violet-300',
                border: 'border-violet-200 dark:border-violet-800/50',
            };
        case 'DOUBLE':
            return {
                bg: 'bg-blue-50 dark:bg-blue-950/30',
                text: 'text-blue-700 dark:text-blue-300',
                border: 'border-blue-200 dark:border-blue-800/50',
            };
        case 'TRIPLE':
            return {
                bg: 'bg-cyan-50 dark:bg-cyan-950/30',
                text: 'text-cyan-700 dark:text-cyan-300',
                border: 'border-cyan-200 dark:border-cyan-800/50',
            };
        case 'QUAD':
            return {
                bg: 'bg-teal-50 dark:bg-teal-950/30',
                text: 'text-teal-700 dark:text-teal-300',
                border: 'border-teal-200 dark:border-teal-800/50',
            };
    }
}

// =============================================================================
// Room status helpers
// =============================================================================

/**
 * Human-readable label for each room status.
 */
export function roomStatusLabel(status: RoomStatus): string {
    const labels: Record<RoomStatus, string> = {
        AVAILABLE: 'Available',
        FULLY_OCCUPIED: 'Fully Occupied',
        UNDER_MAINTENANCE: 'Maintenance',
        RESERVED: 'Reserved',
    };
    return labels[status] ?? status;
}

/**
 * Tailwind color classes for room status badges.
 */
export function roomStatusColors(status: RoomStatus): {
    bg: string;
    text: string;
    border: string;
    dot: string;
} {
    switch (status) {
        case 'AVAILABLE':
            return {
                bg: 'bg-green-50 dark:bg-green-950/30',
                text: 'text-green-700 dark:text-green-300',
                border: 'border-green-200 dark:border-green-800/50',
                dot: 'bg-green-500',
            };
        case 'FULLY_OCCUPIED':
            return {
                bg: 'bg-red-50 dark:bg-red-950/30',
                text: 'text-red-700 dark:text-red-300',
                border: 'border-red-200 dark:border-red-800/50',
                dot: 'bg-red-500',
            };
        case 'UNDER_MAINTENANCE':
            return {
                bg: 'bg-amber-50 dark:bg-amber-950/30',
                text: 'text-amber-700 dark:text-amber-300',
                border: 'border-amber-200 dark:border-amber-800/50',
                dot: 'bg-amber-500',
            };
        case 'RESERVED':
            return {
                bg: 'bg-blue-50 dark:bg-blue-950/30',
                text: 'text-blue-700 dark:text-blue-300',
                border: 'border-blue-200 dark:border-blue-800/50',
                dot: 'bg-blue-400',
            };
    }
}

// =============================================================================
// Price / occupancy helpers
// =============================================================================

/**
 * Formats a price string (from BigDecimal) as a Ghana Cedi currency string.
 *
 * @example
 * formatPrice('1500.00') // → '₵1,500.00'
 */
export function formatPrice(price: string | number): string {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '₵—';
    return `₵${num.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Returns a descriptive beds-remaining string.
 *
 * @example
 * bedsLabel(4, 2)  // → '2 beds left'
 * bedsLabel(1, 0)  // → 'Fully occupied'
 */
export function bedsLabel(bedsAvailable: number): string {
    if (bedsAvailable <= 0) return 'Fully occupied';
    if (bedsAvailable === 1) return '1 bed left';
    return `${bedsAvailable} beds left`;
}

/**
 * Returns the image fallback URL when a room has no cover image.
 */
export function roomImageFallback(): string {
    return 'https://placehold.co/400x300/e5e7eb/9ca3af?text=No+Image';
}
