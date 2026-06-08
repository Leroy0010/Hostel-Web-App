package com.leroy.hostelbackend.module.booking.model;

import com.leroy.hostelbackend.module.booking.dto.CreateBookingRequest;
import com.leroy.hostelbackend.module.room.model.Room;
import com.leroy.hostelbackend.module.user.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Persistent booking entity.
 *
 * <p><strong>Period-scoped capacity model:</strong> Capacity is no longer tracked by
 * {@code room.currentOccupancy} alone. Availability for a given
 * {@code (academicYear, semester)} is computed dynamically by counting active bookings
 * ({@code APPROVED} or {@code CHECKED_IN}) for that room in that period. This allows
 * future semesters to be booked while the current semester is still occupied.
 *
 * <p><strong>Multiple bookings per student:</strong> A student may hold bookings for
 * multiple different rooms simultaneously. The only hard constraint is that the same
 * student cannot have two active bookings for the <em>same room</em> in the same period
 * (enforced by the partial unique index {@code idx_unique_active_room_booking}).
 *
 * <p><strong>Semester linearity rule:</strong> A SECOND semester booking is only permitted
 * if the FIRST semester for the same room and academic year already has a CHECKED_IN or
 * CHECKED_OUT booking. Enforced in {@code BookingService.validateSemesterLinearity()}.
 *
 * <p><strong>Payment expiry:</strong> Manager sets {@code paymentExpiresAt} at approval.
 * The {@code BookingExpiredSweeper} auto-expires APPROVED bookings past this deadline
 * with no paymentRef.
 *
 * <p><strong>Auto-draft PENDING expiry:</strong> Waitlist-promoted bookings are auto-created
 * as PENDING with a {@code pendingExpiresAt} deadline. The sweeper auto-rejects them if
 * not actioned, advancing the waitlist to the next student.
 */
@Getter
@Setter
@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.RESTRICT)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.RESTRICT)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    /**
     * Current lifecycle status.
     * Stored as VARCHAR; Java enum {@link BookingStatus} is the enforcer.
     * Transitions are owned by {@code BookingService} and {@code BookingExpiredSweeper}.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private BookingStatus status = BookingStatus.PENDING;

    /** Academic year, e.g. "2025/2026". Format enforced in BookingService. */
    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    /** FIRST | SECOND | FULL. Enforced by DTO pattern validation. */
    @Column(name = "semester", nullable = false)
    private String semester;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    /**
     * APPROVED payment deadline set by the manager.
     * If the student does not submit a paymentRef before this time,
     * the {@code BookingExpiredSweeper} moves the booking to {@link BookingStatus#EXPIRED}.
     */
    @Column(name = "payment_expires_at")
    private LocalDateTime paymentExpiresAt;

    /**
     * Auto-draft PENDING expiry deadline. Set only when {@code isWaitlistDraft = true}.
     * If the manager does not approve/reject before this time, the sweeper auto-rejects
     * the booking and advances the waitlist to the next student.
     */
    @Column(name = "pending_expires_at")
    private LocalDateTime pendingExpiresAt;

    /**
     * {@code true} when this booking was auto-created by the waitlist promotion flow.
     * Helps managers identify which PENDING bookings came from the waitlist.
     */
    @Column(name = "is_waitlist_draft", nullable = false)
    private Boolean isWaitlistDraft = false;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejected_reason")
    private String rejectedReason;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @Column(name = "checked_out_at")
    private LocalDateTime checkedOutAt;

    /**
     * Informational amount declared by the student.
     * Not validated against any payment gateway.
     */
    @Column(name = "amount_paid", precision = 10, scale = 2)
    private BigDecimal amountPaid;

    /**
     * External payment reference (MTN Mobile Money, bank slip, etc.).
     * Provided by the student; verified offline by the manager before check-in.
     */
    @Column(name = "payment_ref")
    private String paymentRef;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // -------------------------------------------------------------------------
    // Factory methods
    // -------------------------------------------------------------------------

    /**
     * Creates a standard student-initiated PENDING booking.
     */
    public static Booking createBooking(CreateBookingRequest request, User student, Room room) {
        var booking = new Booking();
        booking.setStudent(student);
        booking.setRoom(room);
        booking.setStatus(BookingStatus.PENDING);
        booking.setAcademicYear(request.academicYear());
        booking.setSemester(request.semester());
        booking.setRequestedAt(LocalDateTime.now());
        booking.setIsWaitlistDraft(false);
        return booking;
    }

    /**
     * Creates an auto-drafted PENDING booking on behalf of a waitlisted student.
     * The manager sees this flagged as a waitlist promotion so they can prioritise it.
     *
     * @param student          the waitlisted student being promoted
     * @param room             the room that just had a bed freed
     * @param academicYear     the period the waitlist entry was for
     * @param semester         the semester the waitlist entry was for
     * @param pendingExpiresAt deadline for the manager to action before it auto-rejects
     */
    public static Booking createWaitlistDraft(
            User student, Room room,
            String academicYear, String semester,
            LocalDateTime pendingExpiresAt
    ) {
        var booking = new Booking();
        booking.setStudent(student);
        booking.setRoom(room);
        booking.setStatus(BookingStatus.PENDING);
        booking.setAcademicYear(academicYear);
        booking.setSemester(semester);
        booking.setRequestedAt(LocalDateTime.now());
        booking.setIsWaitlistDraft(true);
        booking.setPendingExpiresAt(pendingExpiresAt);
        return booking;
    }
}