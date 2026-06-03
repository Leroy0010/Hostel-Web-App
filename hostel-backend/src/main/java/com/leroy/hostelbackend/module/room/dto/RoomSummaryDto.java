package com.leroy.hostelbackend.module.room.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Lightweight room summary for lists and availability grids.
 */
public record RoomSummaryDto(
        UUID id,
        String roomNumber,
        String roomType,
        Short capacity,
        Short currentOccupancy,
        Short bedsAvailable,
        BigDecimal pricePerSemester,
        String status,
        Integer floorNumber,
        String imageUrl
) {}
