package com.leroy.hostelbackend.module.waitlist.dto;

import java.time.LocalDateTime;
import java.util.UUID;

// =============================================================================
// Waitlist DTOs
// =============================================================================


/**
 * Student-facing waitlist entry — shows what they are waiting for.
 */
public record WaitlistDto(
        UUID id,
        UUID hostelId,
        String hostelName,
        String hostelImageUrl,
        Integer position,
        String academicYear,
        String semester,
        LocalDateTime joinedAt,
        Boolean notified
) {}
