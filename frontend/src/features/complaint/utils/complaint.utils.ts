import type {
    ComplaintCategory,
    ComplaintStatus,
} from '../types/complaint.types';

// =============================================================================
// Status helpers
// =============================================================================

export function complaintStatusLabel(status: ComplaintStatus): string {
    const labels: Record<ComplaintStatus, string> = {
        OPEN: 'Open',
        IN_PROGRESS: 'In Progress',
        RESOLVED: 'Resolved',
        CLOSED: 'Closed',
    };
    return labels[status];
}

export function complaintStatusColors(status: ComplaintStatus): {
    bg: string;
    text: string;
    border: string;
    dot: string;
} {
    switch (status) {
        case 'OPEN':
            return {
                bg: 'bg-red-50 dark:bg-red-950/30',
                text: 'text-red-700 dark:text-red-300',
                border: 'border-red-200 dark:border-red-800/50',
                dot: 'bg-red-500',
            };
        case 'IN_PROGRESS':
            return {
                bg: 'bg-amber-50 dark:bg-amber-950/30',
                text: 'text-amber-700 dark:text-amber-300',
                border: 'border-amber-200 dark:border-amber-800/50',
                dot: 'bg-amber-400',
            };
        case 'RESOLVED':
            return {
                bg: 'bg-green-50 dark:bg-green-950/30',
                text: 'text-green-700 dark:text-green-300',
                border: 'border-green-200 dark:border-green-800/50',
                dot: 'bg-green-500',
            };
        case 'CLOSED':
            return {
                bg: 'bg-gray-100 dark:bg-gray-800/60',
                text: 'text-gray-500 dark:text-gray-400',
                border: 'border-gray-200 dark:border-gray-700',
                dot: 'bg-gray-400',
            };
    }
}

/** Returns true for terminal statuses where no further action can be taken. */
export function isTerminalComplaintStatus(status: ComplaintStatus): boolean {
    return status === 'CLOSED';
}

// =============================================================================
// Category helpers
// =============================================================================

export function complaintCategoryLabel(category: ComplaintCategory): string {
    const labels: Record<ComplaintCategory, string> = {
        MAINTENANCE: 'Maintenance',
        CLEANLINESS: 'Cleanliness',
        SECURITY: 'Security',
        NOISE: 'Noise',
        BILLING: 'Billing',
        OTHER: 'Other',
    };
    return labels[category];
}

export function complaintCategoryColors(category: ComplaintCategory): {
    bg: string;
    text: string;
    border: string;
} {
    switch (category) {
        case 'MAINTENANCE':
            return {
                bg: 'bg-orange-50 dark:bg-orange-950/30',
                text: 'text-orange-700 dark:text-orange-300',
                border: 'border-orange-200 dark:border-orange-800/50',
            };
        case 'CLEANLINESS':
            return {
                bg: 'bg-teal-50 dark:bg-teal-950/30',
                text: 'text-teal-700 dark:text-teal-300',
                border: 'border-teal-200 dark:border-teal-800/50',
            };
        case 'SECURITY':
            return {
                bg: 'bg-red-50 dark:bg-red-950/30',
                text: 'text-red-700 dark:text-red-300',
                border: 'border-red-200 dark:border-red-800/50',
            };
        case 'NOISE':
            return {
                bg: 'bg-purple-50 dark:bg-purple-950/30',
                text: 'text-purple-700 dark:text-purple-300',
                border: 'border-purple-200 dark:border-purple-800/50',
            };
        case 'BILLING':
            return {
                bg: 'bg-blue-50 dark:bg-blue-950/30',
                text: 'text-blue-700 dark:text-blue-300',
                border: 'border-blue-200 dark:border-blue-800/50',
            };
        case 'OTHER':
            return {
                bg: 'bg-gray-100 dark:bg-gray-800/60',
                text: 'text-gray-600 dark:text-gray-400',
                border: 'border-gray-200 dark:border-gray-700',
            };
    }
}

// =============================================================================
// Date helper (shared with review pattern)
// =============================================================================

export function complaintDateLabel(iso: string): string {
    const date = new Date(iso);
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    return new Intl.DateTimeFormat('en-GH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

// =============================================================================
// Score helpers
// =============================================================================

/**
 * Returns a Tailwind color class for the net score number.
 * Positive = green, negative = red, zero = gray.
 */
export function netScoreColorClass(score: number): string {
    if (score > 0) return 'text-green-600 dark:text-green-400';
    if (score < 0) return 'text-red-500 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
}
