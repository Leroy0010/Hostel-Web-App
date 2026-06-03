package com.leroy.hostelbackend.module.booking.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Full booking detail returned to the client.
 */
public record BookingDto(
        UUID id,
        StudentSummary student,
        RoomSummary room,
        String status,
        String academicYear,
        String semester,
        LocalDateTime requestedAt,
        LocalDateTime approvedAt,
        ApprovedBySummary approvedBy,
        LocalDateTime rejectedAt,
        String rejectedReason,
        LocalDateTime checkedInAt,
        LocalDateTime checkedOutAt,
        BigDecimal amountPaid,
        String paymentRef,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record StudentSummary(UUID id, String firstName, String lastName, String email) {}
    public record RoomSummary(UUID id, String roomNumber, String roomType, UUID hostelId, String hostelName) {}
    public record ApprovedBySummary(UUID id, String firstName, String lastName) {}
}


