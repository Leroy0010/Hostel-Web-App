package com.leroy.hostelbackend.shared.exception;
/**
 * Thrown when a room has no remaining beds at the time a booking is approved,
 * or when a concurrent transaction wins the optimistic lock race.
 * Handled by {@link GlobalExceptionHandler} → {@code 409 Conflict}.
 */
public class RoomFullyOccupiedException extends RuntimeException {

    public RoomFullyOccupiedException(String roomNumber) {
        super("Room " + roomNumber + " has no remaining beds.");
    }
}
