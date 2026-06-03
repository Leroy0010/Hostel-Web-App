package com.leroy.hostelbackend.module.booking.model;

/**
 * Full booking lifecycle state machine.
 * Stored as VARCHAR in {@code bookings.status}.
 *
 * <pre>
 * [Student submits]
 *       │
 *       ▼
 *   PENDING ──(manager approves, grace period set)──▶ APPROVED ──(student pays + checks in)──▶ CHECKED_IN
 *       │                                                  │                                         │
 *       │──(manager rejects)──▶ REJECTED                  │──(student cancels)──▶ CANCELLED         │
 *       │                                                  │                                  (checks out)
 *       │──(student cancels)──▶ CANCELLED                  │──(grace period elapsed)──▶ EXPIRED      ▼
 *                                                                                          CHECKED_OUT
 * </pre>
 *
 * <p><strong>Multiple active bookings per student are allowed.</strong>
 * A student may hold multiple PENDING, APPROVED, or CHECKED_IN bookings simultaneously —
 * for different rooms and/or different hostels. The system sends soft reminders when
 * a check-in occurs so the student can cancel any bookings they no longer need.
 *
 * <p><strong>EXPIRED:</strong> Introduced to distinguish between student-initiated
 * cancellations ({@code CANCELLED}) and system-initiated cancellations caused by the
 * student missing the manager's payment deadline ({@code EXPIRED}). This distinction
 * matters for analytics and for the student's booking history — it tells them
 * "you lost this booking because you didn't pay in time" rather than "you chose to cancel".
 */
public enum BookingStatus {

    /** Submitted by student — awaiting manager action. */
    PENDING,

    /**
     * Approved by manager. Bed capacity is locked immediately on approval.
     * Student must submit their payment reference before {@code paymentExpiresAt}
     * or the booking will be automatically moved to {@link #EXPIRED}.
     */
    APPROVED,

    /** Rejected by manager — bed capacity is NOT affected. */
    REJECTED,

    /**
     * Student has physically checked into the room.
     * Multiple CHECKED_IN bookings per student are permitted (e.g. two rooms).
     */
    CHECKED_IN,

    /** Student has vacated the room. Bed is freed and the waitlist is triggered. */
    CHECKED_OUT,

    /** Cancelled by the student while PENDING or APPROVED. Bed freed if was APPROVED. */
    CANCELLED,

    /**
     * System-cancelled: the student did not submit a payment reference before
     * the manager's grace period ({@code paymentExpiresAt}) elapsed.
     * Triggered by {@code BookingExpiredSweeper}.
     * Bed is freed and the waitlist is triggered automatically.
     */
    EXPIRED,

    /**
     * Internal waitlist flow placeholder. The waitlist entry is the source of truth;
     * this status is never set directly — when promoted, a PENDING booking is created.
     */
    WAITLISTED
}