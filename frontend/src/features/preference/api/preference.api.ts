import { apiClient } from '@/lib/axios';
import type {
    PreferenceDto,
    RoomMatchResultDto,
    SavePreferencesPayload,
} from '../types/preference.types';

/**
 * Raw API call functions for the preference and roommate-matching domain.
 *
 * Pure async functions with no React Query coupling.
 * The Axios interceptor in {@code src/lib/axios.ts} strips the
 * {@code ApiResponse<T>} envelope so each function receives domain data directly.
 */

// =============================================================================
// Student — preferences CRUD
// =============================================================================

/**
 * Fetches the authenticated student's current lifestyle preference tags.
 *
 * Returns an empty tags list (not an error) when the student has never saved
 * preferences. The {@code updatedAt} field will be null in that case.
 *
 * Maps to: {@code GET /api/preferences/my}
 */
export function fetchMyPreferences(): Promise<PreferenceDto> {
    return apiClient.get('/preferences/my');
}

/**
 * Creates or fully replaces the authenticated student's preference tags.
 *
 * Full-replace semantics — the provided tag list becomes the complete set.
 * Send an empty array to clear all tags.
 *
 * The backend de-duplicates, validates against {@code PreferenceTag}, and
 * persists in sorted order. Unknown tag strings are rejected with 400.
 *
 * Maps to: {@code PUT /api/preferences/my}
 *
 * @param payload - Complete desired tag set (max 10 tags).
 */
export function saveMyPreferences(
    payload: SavePreferencesPayload
): Promise<PreferenceDto> {
    return apiClient.put('/preferences/my', payload);
}

// =============================================================================
// Student — roommate matching
// =============================================================================

/**
 * Runs the roommate matching algorithm for a specific hostel and returns
 * a list of rooms ordered by lifestyle compatibility (best match first).
 *
 * The algorithm:
 *  1. Loads the student's preference tags.
 *  2. GIN-index query: finds students with overlapping tags.
 *  3. Finds active bookings for those students in the hostel.
 *  4. Filters to rooms with free beds (AVAILABLE status).
 *  5. Sorts by matching tag count desc, then fewest occupants.
 *
 * Returns an empty suggestions list (not an error) when:
 *  - The student has no preference tags set.
 *  - No compatible occupants are found in the hostel.
 *
 * Maps to: {@code GET /api/preferences/match/{hostelId}}
 *
 * @param hostelId - UUID of the hostel to search within.
 */
export function fetchRoomMatches(
    hostelId: string
): Promise<RoomMatchResultDto> {
    return apiClient.get(`/preferences/match/${hostelId}`);
}

// =============================================================================
// Admin / Manager — read any student's preferences
// =============================================================================

/**
 * Fetches the preference tags for any student by their UUID.
 *
 * Used by admin analytics and the manager room-assignment view to understand
 * a student's lifestyle profile before manually assigning a room.
 *
 * Maps to: {@code GET /api/preferences/students/{studentId}}
 *
 * @param studentId - UUID of the student whose preferences to retrieve.
 */
export function fetchStudentPreferences(
    studentId: string
): Promise<PreferenceDto> {
    return apiClient.get(`/preferences/students/${studentId}`);
}
