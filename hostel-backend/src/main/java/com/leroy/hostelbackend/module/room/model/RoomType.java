package com.leroy.hostelbackend.module.room.model;

/**
 * Physical room configuration / accommodation type.
 * Maps to: rooms.room_type (VARCHAR 15)
 */
public enum RoomType {
    /** One bed — one occupant. */
    SINGLE,

    /** Two beds — up to two occupants. */
    DOUBLE,

    /** Three beds. */
    TRIPLE,

    /** Four beds. */
    QUAD,
}
