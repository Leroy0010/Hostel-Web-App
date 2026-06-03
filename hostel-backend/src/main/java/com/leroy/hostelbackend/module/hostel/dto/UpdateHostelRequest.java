package com.leroy.hostelbackend.module.hostel.dto;

import com.leroy.hostelbackend.module.hostel.model.GenderPolicy;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

/**
 * Request body for updating hostel details (ADMIN only).
 * All fields are optional — only non-null values are applied (patch semantics).
 */
public record UpdateHostelRequest(

        @Size(max = 150, message = "Name must not exceed 150 characters")
        String name,

        @Size(max = 300, message = "Address must not exceed 300 characters")
        String address,

        String description,

        GenderPolicy genderPolicy,

        String imageUrl,

        @DecimalMin(value = "-90.0",  message = "Latitude must be between -90 and 90")
        @DecimalMax(value = "90.0",   message = "Latitude must be between -90 and 90")
        Double latitude,

        @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
        @DecimalMax(value = "180.0",  message = "Longitude must be between -180 and 180")
        Double longitude
) {}
 