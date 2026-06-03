package com.leroy.hostelbackend.shared.exception;

/**
 * Machine-readable error codes returned in every {@link ApiError} response.
 * The frontend uses these codes to decide what message or action to show.
 */
public enum ErrorCode {

    // --- 404 Resource ---
    RESOURCE_NOT_FOUND,

    // --- 409 Business Rule Conflicts ---
    ROOM_FULLY_OCCUPIED,
    BOOKING_ALREADY_EXISTS,
    INVALID_BOOKING_TRANSITION,
    ALREADY_ON_WAITLIST,
    DUPLICATE_ROOM_NUMBER,

    // --- 402 Payment ---
    PAYMENT_FAILED,

    // --- 403 Authorization ---
    FORBIDDEN,
    USER_DEACTIVATED,

    // --- 401 Authentication ---
    UNAUTHORIZED,
    INVALID_TOKEN,
    BAD_CREDENTIALS,

    // --- 400 Validation / Input ---
    VALIDATION_FAILED,
    ILLEGAL_ARGUMENT,
    ILLEGAL_STATE,

    // --- 429 Rate Limiting ---
    TOO_MANY_REQUESTS,

    // --- 500 Server ---
    INTERNAL_SERVER_ERROR
}