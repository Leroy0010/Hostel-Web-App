package com.leroy.hostelbackend.shared.exception;

/**
 * Thrown when a student attempts to join a waitlist they are already on.
 * Handled by {@link GlobalExceptionHandler} → {@code 409 Conflict}.
 */
public class AlreadyOnWaitlistException extends RuntimeException {
    public AlreadyOnWaitlistException(String message) {
        super(message);
    }

    public AlreadyOnWaitlistException() {
        super("You are already on the waitlist for this hostel.");
    }
}
