package com.leroy.hostelbackend.module.booking.model;

/**
 * Full booking lifecycle state machine. Stored as VARCHAR in {@code bookings.status}.
 *
 * <pre>
 * [Student submits / Waitlist auto-drafts]
 *       │
 *       ▼
 *   PENDING ──── (manager approves + grace period) ────▶ APPROVED ──── (check in) ────▶ CHECKED_IN
 *       │                                                    │                                │
 *       │──(manager rejects)──▶ REJECTED                    │──(student cancels)──▶ CANCELLED  │──(check out)──▶ CHECKED_OUT
 *       │──(student cancels)──▶ CANCELLED                   │──(grace period elapsed)──▶ EXPIRED
 *       │──(pendingExpiresAt elapsed, is_waitlist_draft)──▶ REJECTED
 * </pre>
 */
public enum BookingStatus {

    /** Submitted by student or auto-drafted by the waitlist flow. Awaiting manager action. */
    PENDING,

    /**
     * Approved by manager. Bed capacity is locked for the target period immediately.
     * Student must submit paymentRef before {@code paymentExpiresAt} or booking → EXPIRED.
     */
    APPROVED,

    /** Rejected by manager. Bed capacity for the target period is unaffected. */
    REJECTED,

    /**
     * Student is physically resident. Multiple CHECKED_IN bookings per student are allowed
     * (e.g. two rooms in different hostels, or consecutive semesters).
     */
    CHECKED_IN,

    /** Student has vacated. Bed freed; waitlist for the next period is triggered. */
    CHECKED_OUT,

    /** Cancelled by the student while PENDING or APPROVED. Bed freed if was APPROVED. */
    CANCELLED,

    /**
     * System-cancelled: student missed the manager's payment deadline (paymentExpiresAt).
     * Also used when a waitlist auto-draft PENDING expires (pendingExpiresAt).
     * Bed freed; waitlist triggered.
     */
    EXPIRED,

    /**
     * Internal placeholder only. Never persisted directly.
     * The waitlist entry is the source of truth; promotion creates a real PENDING booking.
     */
    WAITLISTED
}