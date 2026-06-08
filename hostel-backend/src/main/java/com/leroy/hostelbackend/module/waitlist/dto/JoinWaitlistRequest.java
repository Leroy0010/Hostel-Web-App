package com.leroy.hostelbackend.module.waitlist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

/**
        * Request body for joining a hostel's waitlist for a specific academic period.
        *
        * @param hostelId     the hostel to join the waitlist for
        * @param academicYear the target academic year, e.g. "2025/2026"
        * @param semester     FIRST | SECOND | FULL
 */
public record JoinWaitlistRequest(

        @NotNull(message = "Hostel ID is required")
        UUID hostelId,

        @NotBlank(message = "Academic year is required")
        @Pattern(
                regexp = "^\\d{4}/\\d{4}$",
                message = "Academic year must be in the format YYYY/YYYY, e.g. 2025/2026"
        )
        String academicYear,

        @NotBlank(message = "Semester is required")
        @Pattern(
                regexp = "^(FIRST|SECOND|FULL)$",
                message = "Semester must be FIRST, SECOND, or FULL"
        )
        String semester
) {}

