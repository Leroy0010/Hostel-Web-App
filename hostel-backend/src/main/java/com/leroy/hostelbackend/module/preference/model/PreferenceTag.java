package com.leroy.hostelbackend.module.preference.model;

/**
 * Allowed lifestyle tags for roommate matching.
 *
 * <p>These are the only valid values accepted by the API. The service validates
 * that every tag in a {@link com.leroy.hostelbackend.module.preference.dto.SavePreferencesRequest} is a member of this enum
 * before persisting, preventing free-text garbage from polluting the array.
 *
 * <p>Stored as strings in the {@code TEXT[]} column so adding a new tag is a
 * code-only change — no schema migration required.
 */
public enum PreferenceTag {

    // Sleep schedule
    NIGHT_OWL,
    EARLY_BIRD,

    // Noise level
    QUIET,
    SOCIAL,

    // Tidiness
    NEAT,
    MESSY,

    // Study habits
    STUDIOUS,
    RELAXED,

    // Smoking
    NON_SMOKER,
    SMOKER
}