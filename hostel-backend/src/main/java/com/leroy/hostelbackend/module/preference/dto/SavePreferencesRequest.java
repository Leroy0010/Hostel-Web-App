package com.leroy.hostelbackend.module.preference.dto;

import com.leroy.hostelbackend.module.preference.model.PreferenceTag;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

// =============================================================================
// Preference + Roommate Matching DTOs
// =============================================================================

/**
 * Request to save (create or replace) a student's lifestyle tags.
 *
 * <p>The list is the complete desired set — this is a full replace, not a merge.
 * Send an empty list to clear all tags.
 *
 * @param tags list of {@link PreferenceTag} values (max 10, no duplicates enforced by service)
 */
public record SavePreferencesRequest(

        @NotNull(message = "Tags list is required (send empty list to clear)")
        @Size(max = 10, message = "You can select at most 10 tags")
        List<PreferenceTag> tags
) {}


