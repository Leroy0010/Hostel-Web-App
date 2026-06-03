package com.leroy.hostelbackend.module.hostel.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Outbound representation of a hostel.
 * Manager details are embedded as a nested summary to avoid extra round-trips.
 */
public record HostelDto(
        UUID id,
        String name,
        String address,
        String description,
        String genderPolicy,
        String imageUrl,
        Boolean isActive,
        Double latitude,
        Double longitude,
        ManagerSummary manager,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    /**
     * Minimal manager information embedded in the hostel response.
     * Avoids exposing the full UserDto (and sensitive fields) inside a hostel payload.
     */
    public record ManagerSummary(UUID id, String firstName, String lastName, String email, String phone) {}
}

