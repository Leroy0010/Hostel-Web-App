package com.leroy.hostelbackend.module.booking.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lightweight booking summary for paginated lists.
 */
public record BookingSummaryDto(
        UUID id,
        UUID studentId,
        String studentName,
        UUID roomId,
        String roomNumber,
        String hostelName,
        String status,
        String academicYear,
        String semester,
        Boolean isWaitlistDraft,
        LocalDateTime requestedAt,
        LocalDateTime paymentExpiresAt
) {}