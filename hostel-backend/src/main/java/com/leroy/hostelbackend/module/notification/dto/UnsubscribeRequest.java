package com.leroy.hostelbackend.module.notification.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request to unregister a push subscription (e.g. user logs out or revokes permission).
 */
public record UnsubscribeRequest(
        @NotBlank(message = "Endpoint is required")
        String endpoint
) {}
