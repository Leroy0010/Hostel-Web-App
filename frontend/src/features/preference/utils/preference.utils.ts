import type {
    PreferenceTag,
    PreferenceTagGroup,
} from '../types/preference.types';

// =============================================================================
// Tag metadata
// =============================================================================

/**
 * Display label for each {@link PreferenceTag} value.
 *
 * Used on badges, selector buttons, and match-reason chips throughout the UI.
 *
 * @example
 * tagLabel('NIGHT_OWL') // → 'Night Owl'
 * tagLabel('NON_SMOKER') // → 'Non-Smoker'
 */
export function tagLabel(tag: PreferenceTag): string {
    const labels: Record<PreferenceTag, string> = {
        NIGHT_OWL: 'Night Owl',
        EARLY_BIRD: 'Early Bird',
        QUIET: 'Quiet',
        SOCIAL: 'Social',
        NEAT: 'Neat',
        MESSY: 'Messy',
        STUDIOUS: 'Studious',
        RELAXED: 'Relaxed',
        NON_SMOKER: 'Non-Smoker',
        SMOKER: 'Smoker',
    };
    return labels[tag] ?? tag;
}

/**
 * Emoji icon for each preference tag.
 *
 * Gives the tag selector a visual anchor that's quick to scan on mobile.
 *
 * @example
 * tagEmoji('QUIET') // → '🤫'
 * tagEmoji('NEAT')  // → '✨'
 */
export function tagEmoji(tag: PreferenceTag): string {
    const emojis: Record<PreferenceTag, string> = {
        NIGHT_OWL: '🦉',
        EARLY_BIRD: '🌅',
        QUIET: '🤫',
        SOCIAL: '🎉',
        NEAT: '✨',
        MESSY: '🌀',
        STUDIOUS: '📚',
        RELAXED: '😌',
        NON_SMOKER: '🚭',
        SMOKER: '🚬',
    };
    return emojis[tag] ?? '•';
}

/**
 * Tailwind color classes for a preference tag badge.
 *
 * Mutually-exclusive pairs (e.g. QUIET/SOCIAL) intentionally get different
 * hues so they're immediately distinguishable at a glance.
 *
 * @returns Object with `bg`, `text`, `border` Tailwind class strings.
 */
export function tagColors(tag: PreferenceTag): {
    bg: string;
    text: string;
    border: string;
} {
    switch (tag) {
        case 'NIGHT_OWL':
            return {
                bg: 'bg-indigo-50 dark:bg-indigo-950/30',
                text: 'text-indigo-700 dark:text-indigo-300',
                border: 'border-indigo-200 dark:border-indigo-800/50',
            };
        case 'EARLY_BIRD':
            return {
                bg: 'bg-amber-50 dark:bg-amber-950/30',
                text: 'text-amber-700 dark:text-amber-300',
                border: 'border-amber-200 dark:border-amber-800/50',
            };
        case 'QUIET':
            return {
                bg: 'bg-teal-50 dark:bg-teal-950/30',
                text: 'text-teal-700 dark:text-teal-300',
                border: 'border-teal-200 dark:border-teal-800/50',
            };
        case 'SOCIAL':
            return {
                bg: 'bg-pink-50 dark:bg-pink-950/30',
                text: 'text-pink-700 dark:text-pink-300',
                border: 'border-pink-200 dark:border-pink-800/50',
            };
        case 'NEAT':
            return {
                bg: 'bg-emerald-50 dark:bg-emerald-950/30',
                text: 'text-emerald-700 dark:text-emerald-300',
                border: 'border-emerald-200 dark:border-emerald-800/50',
            };
        case 'MESSY':
            return {
                bg: 'bg-orange-50 dark:bg-orange-950/30',
                text: 'text-orange-700 dark:text-orange-300',
                border: 'border-orange-200 dark:border-orange-800/50',
            };
        case 'STUDIOUS':
            return {
                bg: 'bg-blue-50 dark:bg-blue-950/30',
                text: 'text-blue-700 dark:text-blue-300',
                border: 'border-blue-200 dark:border-blue-800/50',
            };
        case 'RELAXED':
            return {
                bg: 'bg-purple-50 dark:bg-purple-950/30',
                text: 'text-purple-700 dark:text-purple-300',
                border: 'border-purple-200 dark:border-purple-800/50',
            };
        case 'NON_SMOKER':
            return {
                bg: 'bg-green-50 dark:bg-green-950/30',
                text: 'text-green-700 dark:text-green-300',
                border: 'border-green-200 dark:border-green-800/50',
            };
        case 'SMOKER':
            return {
                bg: 'bg-gray-100 dark:bg-gray-800/60',
                text: 'text-gray-600 dark:text-gray-400',
                border: 'border-gray-200 dark:border-gray-700',
            };
    }
}

// =============================================================================
// Tag grouping — UI only
// =============================================================================

/**
 * Semantically grouped preference tags for the tag selector UI.
 *
 * Groups mirror the comment grouping in the Java {@code PreferenceTag} enum.
 * This is purely a UI concern — the backend treats all tags as a flat list.
 */
export const PREFERENCE_TAG_GROUPS: PreferenceTagGroup[] = [
    {
        label: 'Sleep Schedule',
        tags: ['NIGHT_OWL', 'EARLY_BIRD'],
    },
    {
        label: 'Noise Level',
        tags: ['QUIET', 'SOCIAL'],
    },
    {
        label: 'Tidiness',
        tags: ['NEAT', 'MESSY'],
    },
    {
        label: 'Study Habits',
        tags: ['STUDIOUS', 'RELAXED'],
    },
    {
        label: 'Smoking',
        tags: ['NON_SMOKER', 'SMOKER'],
    },
];

// =============================================================================
// Formatting helpers
// =============================================================================

/**
 * Formats a preference last-updated timestamp as a short relative label.
 *
 * @param isoTimestamp - ISO-8601 date-time string, or null.
 * @returns Label like "Updated 2 days ago" or "Never updated".
 *
 * @example
 * preferenceUpdatedLabel('2025-06-10T...') // → 'Updated 3 days ago'
 * preferenceUpdatedLabel(null)              // → 'Never saved'
 */
export function preferenceUpdatedLabel(isoTimestamp: string | null): string {
    if (!isoTimestamp) return 'Never saved';
    const date = new Date(isoTimestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);

    if (diffDays === 0) return 'Updated today';
    if (diffDays === 1) return 'Updated yesterday';
    if (diffDays < 30) {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        return `Updated ${rtf.format(-diffDays, 'day')}`;
    }
    return `Updated ${date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })}`;
}

/**
 * Returns a human-readable description of a match count for accessibility
 * and empty-state copy.
 *
 * @example
 * matchCountLabel(3) // → '3 shared interests'
 * matchCountLabel(1) // → '1 shared interest'
 */
export function matchCountLabel(count: number): string {
    return count === 1 ? '1 shared interest' : `${count} shared interests`;
}
