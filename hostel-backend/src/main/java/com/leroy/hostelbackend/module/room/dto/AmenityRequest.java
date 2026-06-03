package com.leroy.hostelbackend.module.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A single amenity entry — used in create/update requests and as part of the response.
 *
 * @param amenity  label, e.g. "Air Conditioning"
 * @param imageUrl optional icon/image URL for this amenity
 */
public record AmenityRequest(

        @NotBlank(message = "Amenity label is required")
        @Size(max = 100, message = "Amenity label must not exceed 100 characters")
        String amenity,

        String imageUrl
) {}