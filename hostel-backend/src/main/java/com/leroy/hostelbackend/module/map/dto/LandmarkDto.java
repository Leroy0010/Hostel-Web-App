package com.leroy.hostelbackend.module.map.dto;

import java.util.UUID;

/**
 * Full landmark detail returned to clients.
 *
 * @param id          landmark UUID
 * @param name        display name
 * @param category    landmark category
 * @param latitude    WGS 84 latitude
 * @param longitude   WGS 84 longitude
 * @param description optional description
 */
public record LandmarkDto(
        UUID   id,
        String name,
        String category,
        Double latitude,
        Double longitude,
        String description
) {}
