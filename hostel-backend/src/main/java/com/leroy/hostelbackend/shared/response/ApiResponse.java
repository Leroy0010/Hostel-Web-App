package com.leroy.hostelbackend.shared.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Standardised JSON envelope returned by every API endpoint.
 *
 * <p>Shape:
 * <pre>
 * {
 *   "timestamp": "2024-09-01T10:00:00",
 *   "success": true,
 *   "message": "Hostel created successfully.",
 *   "data": { ... }          // omitted when null
 * }
 * </pre>
 *
 * <p>Use the static factory methods rather than the constructor directly:
 * <pre>
 *   return ResponseEntity.ok(ApiResponse.success("Fetched.", pageResult));
 *   return ResponseEntity.status(201).body(ApiResponse.success("Created.", dto));
 * </pre>
 *
 * @param <T> the type of the payload carried in {@code data}
 */
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final LocalDateTime timestamp = LocalDateTime.now();
    private final boolean success;
    private final String message;
    private final T data;

    private ApiResponse(boolean success, String message, T data) {
        this.success = success;
        this.message = message;
        this.data    = data;
    }

    /** Successful response with a payload. */
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    /** Successful response with no payload (e.g. delete operations). */
    public static <T> ApiResponse<T> success(String message) {
        return new ApiResponse<>(true, message, null);
    }

    /** Error response — prefer {@code ApiError} for structured errors; use this for simple messages. */
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }
}