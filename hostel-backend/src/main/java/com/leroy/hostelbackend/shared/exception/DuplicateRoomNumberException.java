package com.leroy.hostelbackend.shared.exception;

/**
 * Thrown when a room number already exists within the same hostel.
 * Handled by {@link GlobalExceptionHandler} → {@code 409 Conflict}.
 */
public class DuplicateRoomNumberException extends RuntimeException {
    public DuplicateRoomNumberException(String message) {
        super(message);
    }

    public DuplicateRoomNumberException(String roomNumber, String hostelName) {
        super("Room number '" + roomNumber + "' already exists in hostel '" + hostelName + "'.");
    }
}
