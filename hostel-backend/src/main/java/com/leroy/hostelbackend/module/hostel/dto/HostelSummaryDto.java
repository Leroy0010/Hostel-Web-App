package com.leroy.hostelbackend.module.hostel.dto;

import java.util.UUID;

/**
 * Lightweight hostel summary used in lists and dropdowns.
 * Omits description, timestamps, and manager detail to reduce payload size.
 */
public record HostelSummaryDto(
        UUID id,
        String name,
        String address,
        String genderPolicy,
        String imageUrl,
        Boolean isActive
) {}

