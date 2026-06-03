package com.leroy.hostelbackend.module.room.dto;

import com.leroy.hostelbackend.module.room.model.RoomStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for changing room status (ADMIN / MANAGER).
 * e.g. marking a room UNDER_MAINTENANCE.
 *
 * @param status the target status string — validated against {@link com.leroy.hostelbackend.module.room.model.RoomStatus}
 */
public record UpdateRoomStatusRequest(
        @NotNull(message = "Status is required")
        RoomStatus status
) {}

