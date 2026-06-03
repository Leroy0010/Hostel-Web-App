package com.leroy.hostelbackend.module.room.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Full room detail returned to the client.
 */
public record RoomDto(
        UUID id,
        UUID hostelId,
        String hostelName,
        String roomNumber,
        String roomType,
        Short capacity,
        Short currentOccupancy,
        Short bedsAvailable,        // computed: capacity - currentOccupancy
        BigDecimal pricePerSemester,
        String status,
        Integer floorNumber,
        String imageUrl,
        List<AmenityDto> amenities,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
