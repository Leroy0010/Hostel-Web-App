package com.leroy.hostelbackend.shared.exception;

import java.util.UUID;

/**
 * Thrown when any entity lookup by ID (or other unique key) returns empty.
 * Handled by {@link GlobalExceptionHandler} → {@code 404 Not Found}.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String entity, UUID id) {
        super(entity + " not found with ID " + id);
    }
}
