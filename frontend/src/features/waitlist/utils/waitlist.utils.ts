import type { Semester } from '@/features/booking/types/booking.types';
import type {
    RoomType,
    
} from '@/features/room/types/room.types';

// =============================================================================
// Label helpers
// =============================================================================

/**
 * Human-readable label for each room type.
 *
 * @example
 * roomTypeLabel('SINGLE') // → 'Single'
 * roomTypeLabel('DORMITORY') // → 'Dormitory'
 */
export function roomTypeLabel(roomType: RoomType): string {
    const labels: Record<RoomType, string> = {
        SINGLE: 'Single',
        DOUBLE: 'Double',
        TRIPLE: 'Triple',
        QUAD: 'Quad',
        
    };
    return labels[roomType] ?? roomType;
}

/**
 * Human-readable label for each semester value.
 *
 * @example
 * semesterLabel('FIRST')  // → 'First Semester'
 * semesterLabel('FULL')   // → 'Full Year'
 */
export function semesterLabel(semester: Semester | string): string {
    switch (semester) {
        case 'FIRST':
            return 'First Semester';
        case 'SECOND':
            return 'Second Semester';
        case 'FULL':
            return 'Full Year';
        default:
            return semester;
    }
}

/**
 * Formats a 1-based queue position as an ordinal string.
 *
 * @example
 * positionLabel(1) // → '1st'
 * positionLabel(3) // → '3rd'
 * positionLabel(11) // → '11th'
 */
export function positionLabel(position: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = position % 100;
    return position + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/**
 * Formats a waitlist join timestamp as a relative or absolute date label.
 * Reuses the same pattern as the review date formatter.
 *
 * @param isoTimestamp - ISO-8601 date-time string.
 * @returns Human-readable date label.
 *
 * @example
 * joinedAtLabel('2025-01-10T...') // → '3 days ago'  (if today is 13 Jan)
 * joinedAtLabel('2024-06-01T...') // → '1 Jun 2024'
 */
export function joinedAtLabel(isoTimestamp: string): string {
    const date = new Date(isoTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        return rtf.format(-diffDays, 'day');
    }
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Returns a Tailwind color token set for the waitlist position badge.
 *
 * Top 3 positions get warm highlight colors to give a sense of proximity
 * to promotion; all others get a neutral gray.
 *
 * @param position - 1-based queue position.
 */
export function positionBadgeColors(position: number): {
    bg: string;
    text: string;
    border: string;
} {
    if (position === 1) {
        return {
            bg: 'bg-amber-50 dark:bg-amber-950/30',
            text: 'text-amber-700 dark:text-amber-300',
            border: 'border-amber-200 dark:border-amber-800/50',
        };
    }
    if (position <= 3) {
        return {
            bg: 'bg-blue-50 dark:bg-blue-950/30',
            text: 'text-blue-700 dark:text-blue-300',
            border: 'border-blue-200 dark:border-blue-800/50',
        };
    }
    return {
        bg: 'bg-gray-100 dark:bg-gray-800/60',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-700',
    };
}

/**
 * All academic year options for the current and upcoming year.
 * Generated dynamically so the form never needs a hardcoded list.
 *
 * @returns Array of strings like ["2024/2025", "2025/2026", "2026/2027"].
 */
export function academicYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    return [
        `${currentYear - 1}/${currentYear}`,
        `${currentYear}/${currentYear + 1}`,
        `${currentYear + 1}/${currentYear + 2}`,
    ];
}
