package com.leroy.hostelbackend.module.room.dto;

import com.leroy.hostelbackend.module.room.model.RoomType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Request body for updating a room. Patch semantics — null fields are ignored.
 */
public record UpdateRoomRequest(

        @Size(max = 20, message = "Room number must not exceed 20 characters")
        String roomNumber,

        RoomType roomType,

        @Min(value = 1, message = "Capacity must be at least 1")
        @Max(value = 20, message = "Capacity must not exceed 20")
        Short capacity,

        @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
        @Digits(integer = 8, fraction = 2, message = "Price must have at most 8 integer and 2 decimal digits")
        BigDecimal pricePerSemester,

        String imageUrl,

        Integer floorNumber
) {}
 