package com.leroy.hostelbackend.module.room.dto;

import java.util.UUID;

/**
 * Amenity response embedded in {@link RoomDto}.
 */
public record AmenityDto(
        UUID id,
        String amenity,
        String imageUrl
) {}
