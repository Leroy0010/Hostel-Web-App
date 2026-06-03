package com.leroy.hostelbackend.shared.exception;


/**
 * Thrown when a manager tries to act on a hostel they are not assigned to.
 * Handled by {@link GlobalExceptionHandler} → {@code 403 Forbidden}.
 */
public class HostelAccessDeniedException extends RuntimeException{
    public HostelAccessDeniedException(String message) {
        super(message);
    }

    public HostelAccessDeniedException() {
        super("You do not have permission to manage this hostel.");
    }
}




