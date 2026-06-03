package com.leroy.hostelbackend.module.booking.dto;

import jakarta.validation.constraints.*;

import java.util.UUID;

/**
 * Request body for a student submitting a booking request.
 *
 * @param roomId       UUID of the room the student wants a bed in
 * @param academicYear e.g. "2024/2025"
 * @param semester     FIRST | SECOND | FULL
 */
public record CreateBookingRequest(

        @NotNull(message = "Room ID is required")
        UUID roomId,

        @NotBlank(message = "Academic year is required")
        @Pattern(
                regexp = "^\\d{4}/\\d{4}$",
                message = "Academic year must be in the format YYYY/YYYY, e.g. 2024/2025"
        )
        String academicYear,

        @NotBlank(message = "Semester is required")
        @Pattern(
                regexp = "^(FIRST|SECOND|FULL)$",
                message = "Semester must be FIRST, SECOND, or FULL"
        )
        String semester
) {}

