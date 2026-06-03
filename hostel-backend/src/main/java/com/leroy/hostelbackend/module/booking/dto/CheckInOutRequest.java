package com.leroy.hostelbackend.module.booking.dto;

/**
 * Request body for manager/admin check-in and check-out actions.
 * (No body needed — the action is derived from the endpoint. Kept as a placeholder
 * for any notes or override reason in the future.)
 */
public record CheckInOutRequest(
        String notes   // optional staff note
) {}
