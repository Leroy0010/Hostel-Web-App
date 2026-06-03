package com.leroy.hostelbackend.shared.exception;

/**
 * Thrown when a student already holds an active booking (PENDING / APPROVED / CHECKED_IN)
 * for the same academic year and semester.
 * Handled by {@link GlobalExceptionHandler} → {@code 409 Conflict}.
 */
public class BookingAlreadyExistsException extends RuntimeException {
    public BookingAlreadyExistsException(String message) {
        super(message);
    }

    public BookingAlreadyExistsException(String semester, String academicYear) {
        super("You already have an active booking for " + semester + " semester, " + academicYear + ".");
    }
}
