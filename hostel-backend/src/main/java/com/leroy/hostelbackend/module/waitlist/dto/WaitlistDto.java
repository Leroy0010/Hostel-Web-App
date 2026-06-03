package com.leroy.hostelbackend.module.waitlist.dto;

import java.time.LocalDateTime;
import java.util.UUID;

// =============================================================================
// Waitlist DTOs
// =============================================================================

/**
 * Response for a single waitlist entry — returned to the student after joining
 * or when viewing their waitlist positions.
 */
public record WaitlistDto(
        UUID id,
        UUID hostelId,
        String hostelName,
        String hostelImageUrl,
        Integer position,
        LocalDateTime joinedAt,
        Boolean notified
) {}
