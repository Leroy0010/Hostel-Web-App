package com.leroy.hostelbackend.module.hostel.dto;

import com.leroy.hostelbackend.module.hostel.model.GenderPolicy;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;
import java.util.UUID;

// =============================================================================
// Hostel DTOs
// All are records — immutable, auto-generates constructor/getters/equals/hashCode.
// =============================================================================

/**
 * Request body for creating a new hostel (ADMIN only).
 *
 * @param name         unique hostel name
 * @param address      physical address
 * @param description  optional long description
 * @param genderPolicy occupancy policy
 * @param imageUrl     S3 URL / key for the cover image (required — upload first, then create)
 * @param latitude     WGS 84 latitude for PostGIS — optional at creation
 * @param longitude    WGS 84 longitude for PostGIS — optional at creation
 * @param managerId    optional: assign a manager immediately
 */
public record CreateHostelRequest(

        @NotBlank(message = "Hostel name is required")
        @Size(max = 150, message = "Name must not exceed 150 characters")
        String name,

        @NotBlank(message = "Address is required")
        @Size(max = 300, message = "Address must not exceed 300 characters")
        String address,

        String description,

        @NotNull(message = "Gender policy is required")
        GenderPolicy genderPolicy,

        @NotBlank(message = "Image URL is required")
        String imageUrl,

        @DecimalMin(value = "-90.0",  message = "Latitude must be between -90 and 90")
        @DecimalMax(value = "90.0",   message = "Latitude must be between -90 and 90")
        Double latitude,

        @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
        @DecimalMax(value = "180.0",  message = "Longitude must be between -180 and 180")
        Double longitude,

        UUID managerId
) {}
