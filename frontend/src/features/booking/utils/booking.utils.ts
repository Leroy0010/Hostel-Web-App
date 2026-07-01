import type { BookingStatus, Semester } from '../types/booking.types';

// =============================================================================
// Booking status helpers
// =============================================================================

/**
 * Human-readable label for each booking status.
 *
 * @example statusLabel('CHECKED_IN') // → 'Checked In'
 */
export function statusLabel(status: BookingStatus): string {
    const labels: Record<BookingStatus, string> = {
        PENDING: 'Pending',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
        CHECKED_IN: 'Checked In',
        CHECKED_OUT: 'Checked Out',
        CANCELLED: 'Cancelled',
        EXPIRED: 'Expired',
        WAITLISTED: 'Waitlisted',
    };
    return labels[status] ?? status;
}

/**
 * Tailwind color classes for each booking status badge.
 */
export function statusColors(status: BookingStatus): {
    bg: string;
    text: string;
    border: string;
    dot: string;
} {
    switch (status) {
        case 'PENDING':
            return {
                bg: 'bg-amber-50 dark:bg-amber-950/30',
                text: 'text-amber-700 dark:text-amber-300',
                border: 'border-amber-200 dark:border-amber-800/50',
                dot: 'bg-amber-400',
            };
        case 'APPROVED':
            return {
                bg: 'bg-blue-50 dark:bg-blue-950/30',
                text: 'text-blue-700 dark:text-blue-300',
                border: 'border-blue-200 dark:border-blue-800/50',
                dot: 'bg-blue-500',
            };
        case 'CHECKED_IN':
            return {
                bg: 'bg-green-50 dark:bg-green-950/30',
                text: 'text-green-700 dark:text-green-300',
                border: 'border-green-200 dark:border-green-800/50',
                dot: 'bg-green-500',
            };
        case 'CHECKED_OUT':
            return {
                bg: 'bg-gray-100 dark:bg-gray-800/60',
                text: 'text-gray-600 dark:text-gray-400',
                border: 'border-gray-200 dark:border-gray-700',
                dot: 'bg-gray-400',
            };
        case 'REJECTED':
        case 'CANCELLED':
        case 'EXPIRED':
            return {
                bg: 'bg-red-50 dark:bg-red-950/30',
                text: 'text-red-700 dark:text-red-300',
                border: 'border-red-200 dark:border-red-800/50',
                dot: 'bg-red-500',
            };
        case 'WAITLISTED':
            return {
                bg: 'bg-purple-50 dark:bg-purple-950/30',
                text: 'text-purple-700 dark:text-purple-300',
                border: 'border-purple-200 dark:border-purple-800/50',
                dot: 'bg-purple-400',
            };
    }
}

/**
 * Returns true for terminal statuses — no further actions can be taken
 * on a booking with one of these statuses.
 */
export function isTerminalStatus(status: BookingStatus): boolean {
    return ['REJECTED', 'CANCELLED', 'EXPIRED', 'CHECKED_OUT'].includes(status);
}

/**
 * Returns true when a student can cancel the booking themselves.
 */
export function isStudentCancellable(status: BookingStatus): boolean {
    return status === 'PENDING' || status === 'APPROVED';
}

/**
 * Returns true when a student can submit a payment reference.
 */
export function isAwaitingPayment(status: BookingStatus): boolean {
    return status === 'APPROVED';
}

// =============================================================================
// Semester helpers
// =============================================================================

/** Human-readable semester label. */
export function semesterLabel(semester: Semester): string {
    const labels: Record<Semester, string> = {
        FIRST: '1st Semester',
        SECOND: '2nd Semester',
        FULL: 'Full Year',
    };
    return labels[semester] ?? semester;
}

// =============================================================================
// Date / countdown helpers
// =============================================================================

/**
 * Formats an ISO 8601 date-time string into a human-readable local date+time.
 *
 * @param iso - ISO 8601 string from the backend.
 * @returns Formatted string e.g. "12 Jan 2025, 14:30"
 */
export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-GH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}

/**
 * Formats an ISO date-time string into a date-only string.
 *
 * @param iso - ISO 8601 string.
 * @returns e.g. "12 Jan 2025"
 */
export function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-GH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(iso));
}

/**
 * Calculates the time remaining until a deadline as a human-readable string.
 *
 * Used to display the payment countdown on APPROVED bookings.
 *
 * @param deadlineIso - ISO 8601 deadline string.
 * @returns
 *  - `"Expired"` if the deadline has passed.
 *  - `"Xd Xh Xm"` if more than an hour remains.
 *  - `"Xm Xs"` if less than an hour remains.
 */
export function timeRemaining(deadlineIso: string | null | undefined): string {
    if (!deadlineIso) return '—';

    const now = Date.now();
    const deadline = new Date(deadlineIso).getTime();
    const diffMs = deadline - now;

    if (diffMs <= 0) return 'Expired';

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
}

/**
 * Returns true if the deadline has already passed.
 *
 * @param deadlineIso - ISO 8601 deadline string. Returns false if null.
 */
export function isPastDeadline(
    deadlineIso: string | null | undefined
): boolean {
    if (!deadlineIso) return false;
    return new Date(deadlineIso).getTime() < Date.now();
}

// =============================================================================
// Academic year helper
// =============================================================================

/**
 * Generates the current academic year string in the format "YYYY/YYYY".
 *
 * Convention: the academic year starts in September.
 * - If current month >= September → "currentYear/(currentYear + 1)"
 * - Otherwise → "(currentYear - 1)/currentYear"
 *
 * @example
 * // Called in November 2025 → "2025/2026"
 * // Called in March 2025   → "2024/2025"
 */
export function currentAcademicYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed, so September = 8
    const startYear = month >= 8 ? year : year - 1;
    return `${startYear}/${startYear + 1}`;
}

/**
 * Generates a list of recent academic year options for the booking form select.
 * Returns the current year and the next year.
 *
 * @example ["2024/2025", "2025/2026"]
 */
export function academicYearOptions(): string[] {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startYear = month >= 8 ? year : year - 1;
    return [
        `${startYear}/${startYear + 1}`,
        `${startYear + 1}/${startYear + 2}`,
    ];
}
