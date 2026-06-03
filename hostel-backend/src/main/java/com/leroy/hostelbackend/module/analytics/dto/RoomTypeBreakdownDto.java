package com.leroy.hostelbackend.module.analytics.dto;

import com.leroy.hostelbackend.module.room.model.RoomType;

/**
 * Room type distribution across the whole system.
 *
 * @param roomType   SINGLE | DOUBLE | TRIPLE | QUAD | DORMITORY
 * @param roomCount  number of rooms of this type
 * @param bedCount   total bed capacity of rooms of this type
 * @param occupiedBeds beds currently occupied
 */
public record RoomTypeBreakdownDto(
        RoomType roomType,
        long   roomCount,
        long   bedCount,
        long   occupiedBeds
) {}
