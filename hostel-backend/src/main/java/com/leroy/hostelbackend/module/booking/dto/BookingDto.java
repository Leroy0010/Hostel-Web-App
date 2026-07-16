package com.leroy.hostelbackend.module.booking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Full booking detail returned to the client.
 * Includes the manager-set payment deadline so the frontend can display a countdown.
 */
public record BookingDto(
        UUID id,
        StudentSummary student,
        RoomSummary room,
        String status,
        String academicYear,
        String semester,
        Boolean isWaitlistDraft,
        LocalDateTime requestedAt,
        LocalDateTime approvedAt,
        ApprovedBySummary approvedBy,
        String managerPhone,
        LocalDateTime paymentExpiresAt,     // null for PENDING/REJECTED/CANCELLED
        LocalDateTime pendingExpiresAt,     // non-null only for waitlist auto-drafts
        LocalDateTime rejectedAt,
        String rejectedReason,
        LocalDateTime checkedInAt,
        LocalDateTime checkedOutAt,
        BigDecimal amountPaid,
        String paymentRef,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record StudentSummary(UUID id, String firstName, String lastName, String email, String phone) {}
    public record RoomSummary(UUID id, String roomNumber, String roomType, BigDecimal price, Integer capacity, Integer currentOccupancy, UUID hostelId, String hostelName) {}
    public record ApprovedBySummary(UUID id, String firstName, String lastName) {}
}


