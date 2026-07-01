package com.leroy.hostelbackend.module.notification.dto;

import com.leroy.hostelbackend.module.notification.model.NotificationType;

import java.time.LocalDateTime;
import java.util.UUID;

// =============================================================================
// Notification DTOs
// =============================================================================

/**
 * Outbound notification — returned in the bell menu feed and pushed via WebSocket/push.
 */
public record NotificationResponse(
        UUID id,
        String title,
        String message,
        NotificationType type,
        String entityType,
        UUID entityId,
        String navigateUrl,
        Boolean isRead,
        LocalDateTime readAt,
        LocalDateTime createdAt
) {}





