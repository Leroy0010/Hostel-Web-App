import type { GenderPolicy } from '../types/hostel.types';

// =============================================================================
// Gender policy display helpers
// =============================================================================

/**
 * Human-readable label for each gender policy.
 *
 * @example
 * genderPolicyLabel('MALE_ONLY') // → 'Male Only'
 */
export function genderPolicyLabel(policy: GenderPolicy): string {
    switch (policy) {
        case 'MALE_ONLY':
            return 'Male Only';
        case 'FEMALE_ONLY':
            return 'Female Only';
        case 'MIXED':
            return 'Mixed';
    }
}

/**
 * Tailwind color classes for each gender policy badge.
 * Returns an object with `bg`, `text`, and `border` classes for
 * consistent rendering across all badge usages.
 */
export function genderPolicyColors(policy: GenderPolicy): {
    bg: string;
    text: string;
    border: string;
} {
    switch (policy) {
        case 'MALE_ONLY':
            return {
                bg: 'bg-blue-50 dark:bg-blue-950/30',
                text: 'text-blue-700 dark:text-blue-300',
                border: 'border-blue-200 dark:border-blue-800/50',
            };
        case 'FEMALE_ONLY':
            return {
                bg: 'bg-pink-50 dark:bg-pink-950/30',
                text: 'text-pink-700 dark:text-pink-300',
                border: 'border-pink-200 dark:border-pink-800/50',
            };
        case 'MIXED':
            return {
                bg: 'bg-purple-50 dark:bg-purple-950/30',
                text: 'text-purple-700 dark:text-purple-300',
                border: 'border-purple-200 dark:border-purple-800/50',
            };
    }
}

// =============================================================================
// Status helpers
// =============================================================================

/**
 * Tailwind color classes for the hostel active/inactive status badge.
 */
export function hostelStatusColors(isActive: boolean): {
    bg: string;
    text: string;
    border: string;
    dot: string;
} {
    return isActive
        ? {
              bg: 'bg-green-50 dark:bg-green-950/30',
              text: 'text-green-700 dark:text-green-300',
              border: 'border-green-200 dark:border-green-800/50',
              dot: 'bg-green-500',
          }
        : {
              bg: 'bg-gray-100 dark:bg-gray-800/60',
              text: 'text-gray-500 dark:text-gray-400',
              border: 'border-gray-200 dark:border-gray-700',
              dot: 'bg-gray-400',
          };
}

// =============================================================================
// Coordinate / distance helpers
// (Used by the Interactive Campus Map feature — PostGIS / Leaflet integration)
// =============================================================================

/**
 * Calculates the great-circle distance between two WGS 84 coordinates
 * using the Haversine formula.
 *
 * @param lat1 - Latitude of point A in decimal degrees.
 * @param lon1 - Longitude of point A in decimal degrees.
 * @param lat2 - Latitude of point B in decimal degrees.
 * @param lon2 - Longitude of point B in decimal degrees.
 * @returns Distance in **kilometres**, rounded to 2 decimal places.
 *
 * @example
 * // Distance from UCC main gate to a hostel
 * haversineDistanceKm(5.1264, -1.2922, 5.1200, -1.2800) // → ~1.34 km
 */
export function haversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth radius in kilometres
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
}

/**
 * Formats a distance (in km) into a human-readable string.
 *
 * @example
 * formatDistance(0.45)  // → '450 m'
 * formatDistance(1.34)  // → '1.34 km'
 */
export function formatDistance(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km} km`;
}

// =============================================================================
// Image helpers
// =============================================================================

/**
 * Returns a fallback placeholder image URL when a hostel's imageUrl is absent
 * or fails to load. Uses a neutral gray placeholder.
 */
export function hostelImageFallback(): string {
    return 'https://placehold.co/800x450/e5e7eb/9ca3af?text=No+Image';
}

/**
 * Accepted MIME types for hostel cover image uploads.
 * Matches what most S3-compatible storage services handle well.
 */
export const ACCEPTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
] as const;

/**
 * Maximum cover image file size: 5 MB.
 * Expressed in bytes for validation logic.
 */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Human-readable version of the max image size for error messages.
 */
export const MAX_IMAGE_SIZE_LABEL = '5 MB';
