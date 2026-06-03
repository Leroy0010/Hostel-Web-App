package com.leroy.hostelbackend.module.preference.dto;

import com.leroy.hostelbackend.module.preference.model.PreferenceTag;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * The authenticated student's current preference tags.
 */
public record PreferenceDto(
        UUID studentId,
        List<PreferenceTag> tags,
        LocalDateTime updatedAt
) {}
