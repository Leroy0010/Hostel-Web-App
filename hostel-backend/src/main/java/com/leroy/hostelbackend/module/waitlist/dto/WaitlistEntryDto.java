package com.leroy.hostelbackend.module.waitlist.dto;

import java.time.LocalDateTime;
import java.util.UUID;


/**
 * Manager-facing waitlist entry — shows who is in the queue.
 */
public record WaitlistEntryDto(
        UUID id,
        Integer position,
        UUID studentId,
        String studentFirstName,
        String studentLastName,
        String studentEmail,
        String academicYear,
        String semester,
        LocalDateTime joinedAt,
        Boolean notified
) {}