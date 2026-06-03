package com.leroy.hostelbackend.module.map.dto;

import com.leroy.hostelbackend.module.map.model.LandmarkCategory;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

/**
 * Request body for updating a landmark (ADMIN only). Patch semantics — null = no change.
 */
public record UpdateLandmarkRequest(

        @Size(max = 200, message = "Name must not exceed 200 characters")
        String name,

        LandmarkCategory category,

        @DecimalMin(value = "-90.0",  message = "Latitude must be between −90 and 90")
        @DecimalMax(value = "90.0",   message = "Latitude must be between −90 and 90")
        Double latitude,

        @DecimalMin(value = "-180.0", message = "Longitude must be between −180 and 180")
        @DecimalMax(value = "180.0",  message = "Longitude must be between −180 and 180")
        Double longitude,

        String description
) {}
