package com.leroy.hostelbackend.module.room.model;

/**
 * Availability / operational state of a room.
 * Maps to: rooms.status (VARCHAR 20)
 * <p>
 * Transitions (managed by RoomService):
 *   AVAILABLE → FULLY_OCCUPIED    when current_occupancy reaches capacity
 *   FULLY_OCCUPIED → AVAILABLE    when a student checks out
 *   AVAILABLE → UNDER_MAINTENANCE when a manager flags the room
 *   UNDER_MAINTENANCE → AVAILABLE when maintenance is resolved
 *   AVAILABLE → RESERVED          for admin-held rooms (e.g. VIP / event)
 */
public enum RoomStatus {
    /** Room has at least one free bed and can accept booking requests. */
    AVAILABLE,

    /** All beds are occupied — room cannot accept new bookings. */
    FULLY_OCCUPIED,

    /** Temporarily unavailable due to repairs or refurbishment. */
    UNDER_MAINTENANCE,

    /** Administratively reserved — not open for general student booking. */
    RESERVED
}

