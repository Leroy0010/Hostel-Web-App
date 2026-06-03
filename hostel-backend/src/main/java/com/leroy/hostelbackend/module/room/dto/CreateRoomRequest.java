package com.leroy.hostelbackend.module.room.dto;

import com.leroy.hostelbackend.module.room.model.RoomType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

// =============================================================================
// Room DTOs
// =============================================================================

/**
 * Request body for creating a room inside a hostel.
 * Manager or Admin only — hostelId comes from the path variable, not the body.
 */
public record CreateRoomRequest(

        @NotBlank(message = "Room number is required")
        @Size(max = 20, message = "Room number must not exceed 20 characters")
        String roomNumber,

        @NotNull(message = "Room type is required")
        RoomType roomType,

        @NotNull(message = "Capacity is required")
        @Min(value = 1, message = "Capacity must be at least 1")
        @Max(value = 20, message = "Capacity must not exceed 20")
        Short capacity,

        @NotNull(message = "Price per semester is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
        @Digits(integer = 8, fraction = 2, message = "Price must have at most 8 integer digits and 2 decimal places")
        BigDecimal pricePerSemester,

        @NotBlank(message = "Room image URL is required")
        String imageUrl,

        Integer floorNumber,

        /** Amenities to attach at creation time. Optional — can be added later. */
        @Valid
        List<AmenityRequest> amenities
) {}
