import type { LandmarkCategory } from '../types/map.types';


export function categoryLabel(category: LandmarkCategory): string {
    const labels: Record<LandmarkCategory, string> = {
        ACADEMIC: 'Academic',
        LIBRARY: 'Library',
        ADMINISTRATIVE: 'Administrative',
        CAFETERIA: 'Cafeteria',
        MEDICAL: 'Medical',
        SPORTS: 'Sports',
        HOSTEL: 'Hostel',
        OTHER: 'Other',
    };
    return labels[category] ?? category;
}

/**
 * Emoji icon for each category — used in map pin divIcons and list items.
 * @alias categoryEmoji — both names are exported for component flexibility.
 */
export function categoryEmoji(category: LandmarkCategory): string {
    const icons: Record<LandmarkCategory, string> = {
        ACADEMIC: '🎓',
        LIBRARY: '📚',
        ADMINISTRATIVE: '🏛️',
        CAFETERIA: '🍽️',
        MEDICAL: '🏥',
        SPORTS: '⚽',
        HOSTEL: '🏠',
        OTHER: '📍',
    };
    return icons[category] ?? '📍';
}

/**
 * Alias for {@link categoryEmoji} — imported by components that prefer the
 * `categoryIcon` name (NearbyLandmarksPanel, CreateLandmarkForm).
 */
export const categoryIcon = categoryEmoji;


/**
 * Full Tailwind color set for each landmark category.
 *
 * Fields:
 *  - `bg` / `text` / `border` — used for chips and cards.
 *  - `pinBg`       — hex color used in inline Leaflet divIcon styles.
 *  - `activeBg`    — Tailwind class for the selected/active filter pill.
 *  - `activeText`  — Tailwind text class when the pill is active.
 */
export function categoryColors(category: LandmarkCategory): {
    bg: string;
    text: string;
    border: string;
    pinBg: string;
    activeBg: string;
    activeText: string;
} {
    switch (category) {
        case 'ACADEMIC':
            return {
                bg: 'bg-blue-50 dark:bg-blue-950/30',
                text: 'text-blue-700 dark:text-blue-300',
                border: 'border-blue-200 dark:border-blue-800/50',
                pinBg: '#3b82f6',
                activeBg: 'bg-blue-600 dark:bg-blue-500',
                activeText: 'text-white',
            };
        case 'LIBRARY':
            return {
                bg: 'bg-amber-50 dark:bg-amber-950/30',
                text: 'text-amber-700 dark:text-amber-300',
                border: 'border-amber-200 dark:border-amber-800/50',
                pinBg: '#f59e0b',
                activeBg: 'bg-amber-500 dark:bg-amber-400',
                activeText: 'text-white',
            };
        case 'ADMINISTRATIVE':
            return {
                bg: 'bg-purple-50 dark:bg-purple-950/30',
                text: 'text-purple-700 dark:text-purple-300',
                border: 'border-purple-200 dark:border-purple-800/50',
                pinBg: '#8b5cf6',
                activeBg: 'bg-purple-600 dark:bg-purple-500',
                activeText: 'text-white',
            };
        case 'CAFETERIA':
            return {
                bg: 'bg-orange-50 dark:bg-orange-950/30',
                text: 'text-orange-700 dark:text-orange-300',
                border: 'border-orange-200 dark:border-orange-800/50',
                pinBg: '#f97316',
                activeBg: 'bg-orange-500 dark:bg-orange-400',
                activeText: 'text-white',
            };
        case 'MEDICAL':
            return {
                bg: 'bg-red-50 dark:bg-red-950/30',
                text: 'text-red-700 dark:text-red-300',
                border: 'border-red-200 dark:border-red-800/50',
                pinBg: '#ef4444',
                activeBg: 'bg-red-600 dark:bg-red-500',
                activeText: 'text-white',
            };
        case 'SPORTS':
            return {
                bg: 'bg-green-50 dark:bg-green-950/30',
                text: 'text-green-700 dark:text-green-300',
                border: 'border-green-200 dark:border-green-800/50',
                pinBg: '#22c55e',
                activeBg: 'bg-green-600 dark:bg-green-500',
                activeText: 'text-white',
            };
        case 'HOSTEL':
            return {
                bg: 'bg-teal-50 dark:bg-teal-950/30',
                text: 'text-teal-700 dark:text-teal-300',
                border: 'border-teal-200 dark:border-teal-800/50',
                pinBg: '#14b8a6',
                activeBg: 'bg-teal-600 dark:bg-teal-500',
                activeText: 'text-white',
            };
        default:
            return {
                bg: 'bg-gray-100 dark:bg-gray-800/60',
                text: 'text-gray-600 dark:text-gray-400',
                border: 'border-gray-200 dark:border-gray-700',
                pinBg: '#6b7280',
                activeBg: 'bg-gray-700 dark:bg-gray-500',
                activeText: 'text-white',
            };
    }
}

export function formatDistance(metres: number): string {
    if (metres < 1000) return `${Math.round(metres)} m`;
    return `${(metres / 1000).toFixed(2)} km`;
}

/**
 * Alias for {@link formatDistance} — some components import this name.
 */
export const formatDistanceLabel = formatDistance;


export function formatWalkingTime(minutes: number): string {
    if (minutes < 60) return `${minutes} min walk`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h walk` : `${h}h ${m}min walk`;
}



export const UCC_CENTER: [number, number] = [5.114141856406612, -1.2935249759278458];


export const UCC_DEFAULT_ZOOM = 15;

export const DEFAULT_NEARBY_RADIUS_METRES = 1000;
