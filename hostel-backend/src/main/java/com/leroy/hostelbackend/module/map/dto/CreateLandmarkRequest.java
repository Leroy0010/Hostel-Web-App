package com.leroy.hostelbackend.module.map.dto;

import com.leroy.hostelbackend.module.map.model.LandmarkCategory;
import jakarta.validation.constraints.*;


/**
 * Request body for creating a new landmark (ADMIN only).
 *
 * @param name        display name shown on the map pin
 * @param category    icon/filter category
 * @param latitude    WGS 84 latitude  (−90 to 90)
 * @param longitude   WGS 84 longitude (−180 to 180)
 * @param description optional longer description shown in the map popup
 */
public record CreateLandmarkRequest(

        @NotBlank(message = "Landmark name is required")
        @Size(max = 200, message = "Name must not exceed 200 characters")
        String name,

        @NotNull(message = "Category is required")
        LandmarkCategory category,

        @NotNull(message = "Latitude is required")
        @DecimalMin(value = "-90.0",  message = "Latitude must be between −90 and 90")
        @DecimalMax(value = "90.0",   message = "Latitude must be between −90 and 90")
        Double latitude,

        @NotNull(message = "Longitude is required")
        @DecimalMin(value = "-180.0", message = "Longitude must be between −180 and 180")
        @DecimalMax(value = "180.0",  message = "Longitude must be between −180 and 180")
        Double longitude,

        @Size(max = 500, message = "Description must not exceed 500 characters")
        String description
) {}
