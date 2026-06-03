package com.leroy.hostelbackend.shared.exception;

/**
 * Thrown when an illegal booking state transition is attempted
 * (e.g. approving an already CHECKED_IN booking).
 * Handled by {@link GlobalExceptionHandler} → {@code 409 Conflict}.
 */
public class InvalidBookingTransitionException extends RuntimeException{
    public InvalidBookingTransitionException(String message) {
        super(message);
    }

    public InvalidBookingTransitionException(String from, String to) {
        super("Cannot transition booking from " + from + " to " + to + ".");
    }
}
