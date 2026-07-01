package com.leroy.hostelbackend.module.waitlist.dto;

import com.leroy.hostelbackend.module.room.model.RoomType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

/**
 * Request body for joining or leaving a hostel waitlist.
 *
 * <p>The {@code roomType} field scopes the queue. A student waiting for a SINGLE
 * room is in a completely separate queue from one waiting for a DOUBLE room,
 * even in the same hostel and semester.
 *
 * @param hostelId     the hostel to queue for
 * @param roomType     the desired room type: SINGLE | DOUBLE | TRIPLE | QUAD | DORMITORY
 * @param academicYear e.g. "2025/2026"
 * @param semester     FIRST | SECOND | FULL
 */
public record JoinWaitlistRequest(

        @NotNull(message = "Hostel ID is required")
        UUID hostelId,

        @NotNull(message = "Room type is required")
        RoomType roomType,

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

