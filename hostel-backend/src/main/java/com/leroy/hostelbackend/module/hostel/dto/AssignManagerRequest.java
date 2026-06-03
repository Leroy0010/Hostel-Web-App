package com.leroy.hostelbackend.module.hostel.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Request body for assigning or re-assigning a manager to a hostel (ADMIN only).
 *
 * @param managerId UUID of a user with role MANAGER
 */
public record AssignManagerRequest(
        @NotNull(message = "Manager ID is required")
        UUID managerId
) {}

