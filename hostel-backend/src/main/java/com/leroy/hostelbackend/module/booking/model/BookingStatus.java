package com.leroy.hostelbackend.module.booking.model;

/**
 * Lifecycle state of a booking request.
 * Maps to: bookings.status (VARCHAR 15)
 *<p>
 * Full state machine:
 *<p>
 *   [Student submits request]<p>
 *        │<p>
 *        ▼<p>
 *     PENDING ──── (manager approves) ──▶ APPROVED ──── (check in) ──▶ CHECKED_IN
 *        │                                                                    │
 *        │─── (manager rejects) ──▶ REJECTED                       (check out)
 *        │                                                                    ▼
 *        │─── (student cancels) ──▶ CANCELLED                        CHECKED_OUT
 *
 *   WAITLISTED is a separate entry-point used by the waitlist service when it
 *   promotes a student — it creates a PENDING booking on their behalf.
 */
public enum BookingStatus {
    /** Submitted by student, awaiting manager action. */
    PENDING,

    /** Approved by manager — student may check in. */
    APPROVED,

    /** Rejected by manager — room was not allocated. */
    REJECTED,

    /** Student has physically checked into the room. */
    CHECKED_IN,

    /** Student has vacated the room at end of semester. */
    CHECKED_OUT,

    /** Cancelled by the student before manager action. */
    CANCELLED,

    /**
     * Placeholder status used internally by the waitlist flow.
     * A booking is not created with this status directly — the waitlist
     * entry is the source of truth. When promoted, a PENDING booking is created.
     */
    WAITLISTED
}
