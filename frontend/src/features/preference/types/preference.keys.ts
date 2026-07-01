/**
 * Centralized React Query key factory for the preference and roommate-matching feature.
 *
 * Key hierarchy:
 * ```
 * ['preferences']
 *   └── ['preferences', 'my']               → authenticated student's own tags
 *   └── ['preferences', 'match', hostelId]  → roommate suggestions for a hostel
 *   └── ['preferences', 'student', studentId] → any student's tags (admin/manager)
 * ```
 *
 * @example Invalidate after saving preferences:
 * ```ts
 * queryClient.invalidateQueries({ queryKey: preferenceKeys.my() });
 * ```
 *
 * @example Invalidate match results after preferences change:
 * ```ts
 * queryClient.invalidateQueries({ queryKey: preferenceKeys.matches() });
 * ```
 */
export const preferenceKeys = {
    /** Root — matches any preference query when used with `invalidateQueries`. */
    all: ['preferences'] as const,

    // -------------------------------------------------------------------------
    // Student — own preferences
    // -------------------------------------------------------------------------

    /**
     * The authenticated student's own preference tags.
     * Maps to {@code GET /api/preferences/my}.
     */
    my: () => [...preferenceKeys.all, 'my'] as const,

    // -------------------------------------------------------------------------
    // Student — roommate matching
    // -------------------------------------------------------------------------

    /** Matches all roommate-match queries (any hostel). */
    matches: () => [...preferenceKeys.all, 'match'] as const,

    /**
     * Roommate match suggestions for a specific hostel.
     * Maps to {@code GET /api/preferences/match/{hostelId}}.
     *
     * Scoped to hostelId so changing the selected hostel triggers a fresh fetch
     * without invalidating other hostels' cached results.
     */
    match: (hostelId: string) =>
        [...preferenceKeys.matches(), hostelId] as const,

    // -------------------------------------------------------------------------
    // Admin / Manager — any student's preferences
    // -------------------------------------------------------------------------

    /** Matches all student-specific preference queries. */
    students: () => [...preferenceKeys.all, 'student'] as const,

    /**
     * Preference tags for a specific student (admin/manager read).
     * Maps to {@code GET /api/preferences/students/{studentId}}.
     */
    student: (studentId: string) =>
        [...preferenceKeys.students(), studentId] as const,
} as const;
