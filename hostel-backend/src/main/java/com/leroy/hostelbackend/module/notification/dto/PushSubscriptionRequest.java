package com.leroy.hostelbackend.module.notification.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request to register a browser push subscription (called from the frontend
 * immediately after {@code pushManager.subscribe()} resolves).
 */
public record PushSubscriptionRequest(
        @NotBlank(message = "Endpoint is required")
        String endpoint,

        @NotBlank(message = "p256dh key is required")
        String p256dh,

        @NotBlank(message = "auth secret is required")
        String auth,

        String userAgent
) {}
