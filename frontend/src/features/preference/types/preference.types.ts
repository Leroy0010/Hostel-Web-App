import type { RoomType } from '@/features/room/types/room.types';
import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

/**
 * All valid lifestyle preference tags for roommate matching.
 * Mirrors the Java {@code PreferenceTag} enum exactly.
 *
 * Stored as strings in a PostgreSQL TEXT[] column — adding a new tag is a
 * code-only change. The backend rejects any value not in this list.
 *
 * Grouped semantically for display in the tag selector UI:
 *  - Sleep schedule: NIGHT_OWL, EARLY_BIRD
 *  - Noise level:    QUIET, SOCIAL
 *  - Tidiness:       NEAT, MESSY
 *  - Study habits:   STUDIOUS, RELAXED
 *  - Smoking:        NON_SMOKER, SMOKER
 */
export type PreferenceTag =
    | 'NIGHT_OWL'
    | 'EARLY_BIRD'
    | 'QUIET'
    | 'SOCIAL'
    | 'NEAT'
    | 'MESSY'
    | 'STUDIOUS'
    | 'RELAXED'
    | 'NON_SMOKER'
    | 'SMOKER';

// =============================================================================
// Response DTOs
// (The Axios interceptor strips ApiResponse<T>, so these are the unwrapped shapes.)
// =============================================================================

/**
 * The authenticated student's current preference tags and last-updated timestamp.
 * Mirrors {@code PreferenceDto} on the backend.
 *
 * Returned by:
 *  - {@code GET /api/preferences/my}
 *  - {@code PUT /api/preferences/my} (after save)
 */
export interface PreferenceDto {
    studentId: string;
    /** Ordered list of the student's active lifestyle tags (max 10). */
    tags: PreferenceTag[];
    /**
     * ISO-8601 timestamp of the last update, or null when no preferences
     * have been saved yet.
     */
    updatedAt: string | null;
}

/**
 * A single room suggestion from the roommate matching algorithm.
 * Mirrors {@code RoomMatchSuggestionDto} on the backend.
 *
 * The backend finds rooms where at least one current occupant's tags overlap
 * with the requesting student's tags. Suggestions are sorted by number of
 * matching tags descending (best match first), then by fewest occupants.
 */
export interface RoomMatchSuggestionDto {
    /** UUID of the suggested room. */
    roomId: string;
    /** Display room number (e.g. "A101"). */
    roomNumber: string;
    /** Room type (e.g. "DOUBLE"). */
    roomType: RoomType;
    /** Number of free beds remaining in this room. */
    bedsAvailable: number;
    /** Price per semester in Cedis. */
    pricePerSemester: number;
    /** Room cover image URL. May be empty string if no image uploaded. */
    imageUrl: string;
    /**
     * Tags shared between the requesting student and at least one occupant.
     * This is what drives the match — shown on the card so students understand why.
     */
    matchingTags: PreferenceTag[];
    /** Number of students currently living in this room. */
    occupantCount: number;
}

/**
 * Full result of the roommate matching algorithm for a hostel.
 * Mirrors {@code RoomMatchResultDto} on the backend.
 *
 * Returned by {@code GET /api/preferences/match/{hostelId}}.
 *
 * Contains both the student's own tags (for display context) and the ordered
 * list of suggestions. An empty suggestions list is a valid (non-error) response
 * when no compatible occupants are found in the hostel.
 */
export interface RoomMatchResultDto {
    /** The requesting student's own preference tags (shown on the results page). */
    myTags: PreferenceTag[];
    /**
     * Ordered suggestions, best match first.
     * Empty when: student has no tags set, or no compatible occupants found.
     */
    suggestions: RoomMatchSuggestionDto[];
}

// =============================================================================
// API payload types
// =============================================================================

/**
 * Request body for saving student preferences.
 * Maps to {@code PUT /api/preferences/my} → {@code SavePreferencesRequest}.
 *
 * Full-replace semantics — sending an empty list clears all tags.
 * The service de-duplicates and validates against {@link PreferenceTag}.
 */
export interface SavePreferencesPayload {
    /** Complete desired tag set (max 10). */
    tags: PreferenceTag[];
}

// =============================================================================
// Zod schema — form validation
// =============================================================================

/**
 * Schema for the preference tag selector form.
 * Maps to {@code PUT /api/preferences/my} → {@code SavePreferencesRequest}.
 *
 * Mirrors the backend {@code @Size(max = 10)} constraint.
 */
export const savePreferencesSchema = z.object({
    tags: z
        .array(
            z.enum([
                'NIGHT_OWL',
                'EARLY_BIRD',
                'QUIET',
                'SOCIAL',
                'NEAT',
                'MESSY',
                'STUDIOUS',
                'RELAXED',
                'NON_SMOKER',
                'SMOKER',
            ])
        )
        .max(10, 'You can select at most 10 tags'),
});

export type SavePreferencesFormValues = z.infer<typeof savePreferencesSchema>;

// =============================================================================
// UI grouping type
// =============================================================================

/**
 * A semantic grouping of tags used only for rendering the tag selector.
 * Not sent to the backend — purely a UI concern.
 */
export interface PreferenceTagGroup {
    /** Display name of the group (e.g. "Sleep Schedule"). */
    label: string;
    /** Tags belonging to this group. */
    tags: PreferenceTag[];
}
