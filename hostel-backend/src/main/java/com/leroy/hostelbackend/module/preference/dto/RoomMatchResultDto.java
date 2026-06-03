package com.leroy.hostelbackend.module.preference.dto;

import com.leroy.hostelbackend.module.preference.model.PreferenceTag;

import java.util.List;

/**
 * A list of roommate suggestions for a hostel, along with the student's own tags
 * so the frontend can display the basis for the match.
 */
public record RoomMatchResultDto(
        List<PreferenceTag>               myTags,
        List<RoomMatchSuggestionDto> suggestions
) {}
