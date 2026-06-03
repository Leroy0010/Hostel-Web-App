package com.leroy.hostelbackend.module.waitlist.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lightweight entry used in the manager's waitlist view for a specific hostel.
 * Includes student details so the manager knows who is waiting.
 */
public record WaitlistEntryDto(
        UUID id,
        Integer position,
        UUID studentId,
        String studentFirstName,
        String studentLastName,
        String studentEmail,
        LocalDateTime joinedAt,
        Boolean notified
) {}