import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    fetchMyPreferences,
    fetchRoomMatches,
    fetchStudentPreferences,
    saveMyPreferences,
} from '../api/preference.api';
import { preferenceKeys } from '../types/preference.keys';
import type {
    PreferenceDto,
    SavePreferencesPayload,
} from '../types/preference.types';
import type { ApiError } from '@/types/api';

// =============================================================================
// Student — own preferences
// =============================================================================

/**
 * Fetches the authenticated student's current lifestyle preference tags.
 *
 * Returns `{ tags: [], updatedAt: null }` (not an error) when no preferences
 * have been saved yet — callers should prompt the student to set them.
 *
 * Maps to: {@code GET /api/preferences/my}
 */
export function useMyPreferences() {
    return useQuery({
        queryKey: preferenceKeys.my(),
        queryFn: fetchMyPreferences,
    });
}

/**
 * Creates or fully replaces the authenticated student's lifestyle preference tags.
 *
 * **Full-replace semantics** — the provided tag list becomes the complete set.
 * Send an empty array to clear all tags.
 *
 * On success:
 *  - Updates the cached `my` preferences immediately (no refetch needed).
 *  - Invalidates all roommate-match queries so suggestions refresh with the new tags.
 *  - Shows a success toast.
 *
 * Maps to: {@code PUT /api/preferences/my}
 */
export function useSavePreferences() {
    const queryClient = useQueryClient();

    return useMutation<PreferenceDto, ApiError, SavePreferencesPayload>({
        mutationFn: (payload: SavePreferencesPayload) =>
            saveMyPreferences(payload),
        onSuccess: (updated) => {
            // Update the cache directly — avoids a redundant network round-trip.
            queryClient.setQueryData(preferenceKeys.my(), updated);

            // Stale match results must refetch because the student's tags changed.
            queryClient.invalidateQueries({
                queryKey: preferenceKeys.matches(),
            });

            toast.success('Your preferences have been saved.');
        },
        onError: (err) => {
            toast.error(
                err.message || 'Failed to save preferences. Please try again.'
            );
        },
    });
}

// =============================================================================
// Student — roommate matching
// =============================================================================

/**
 * Fetches roommate match suggestions for a specific hostel.
 *
 * The backend runs a GIN-index overlap query against students currently living
 * in the hostel, filters to rooms with free beds, and returns suggestions sorted
 * by matching tag count descending.
 *
 * Returns an empty suggestions list (not an error) when:
 *  - The student has no preference tags set.
 *  - No compatible occupants are found in the requested hostel.
 *
 * The query is disabled when `hostelId` is not provided so it won't fire
 * prematurely on pages where the hostel hasn't been selected yet.
 *
 * Maps to: {@code GET /api/preferences/match/{hostelId}}
 *
 * @param hostelId - UUID of the hostel to search within. Pass `undefined` to disable.
 */
export function useRoomMatches(hostelId: string | undefined) {
    return useQuery({
        queryKey: hostelId
            ? preferenceKeys.match(hostelId)
            : preferenceKeys.matches(),
        queryFn: () => fetchRoomMatches(hostelId!),
        enabled: Boolean(hostelId),
        // Suggestions don't change frequently — stale for 2 minutes before
        // a background refetch is triggered on re-focus.
        staleTime: 2 * 60 * 1000,
    });
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
 * The query is disabled when `studentId` is not provided.
 *
 * Maps to: {@code GET /api/preferences/students/{studentId}}
 *
 * @param studentId - UUID of the student. Pass `undefined` to disable.
 */
export function useStudentPreferences(studentId: string | undefined) {
    return useQuery({
        queryKey: studentId
            ? preferenceKeys.student(studentId)
            : preferenceKeys.students(),
        queryFn: () => fetchStudentPreferences(studentId!),
        enabled: Boolean(studentId),
    });
}
