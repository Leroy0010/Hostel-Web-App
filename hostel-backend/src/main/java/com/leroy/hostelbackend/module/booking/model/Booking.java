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
 * <p><strong>Multiple bookings per student:</strong> A student may hold multiple
 * active bookings simultaneously. There is no unique constraint on
 * {@code (student_id, academic_year, semester)} — that constraint has been replaced
 * by a partial unique index that only prevents booking the <em>same room</em> twice
 * in the same period. The system sends soft reminders when a check-in occurs.
 *
 * <p><strong>Capacity locking on APPROVED:</strong> When the manager approves a booking,
 * {@code room.currentOccupancy} is incremented immediately. This prevents the race
 * condition where multiple students are approved for a room that only has one bed left.
 *
 * <p><strong>Payment expiry:</strong> When approving, the manager sets a grace period
 * (in hours). If the student does not submit a {@code paymentRef} before
 * {@code paymentExpiresAt}, the {@code BookingExpiredSweeper} automatically sets
 * the status to {@link BookingStatus#EXPIRED}, releases the bed, and notifies the waitlist.
 *
 * <p><strong>Payment model:</strong> No gateway is integrated. {@code paymentRef} is
 * an external transaction ID (Mobile Money, bank slip) verified offline by the manager.
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
     * Lifecycle status. Stored as VARCHAR — Java enum is the sole enforcer.
     * Transitions are managed exclusively in {@code BookingService} and
     * {@code BookingExpiredSweeper}.
     *
     * @see BookingStatus
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private BookingStatus status = BookingStatus.PENDING;

    /** e.g. "2024/2025" */
    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    /** FIRST | SECOND | FULL */
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
     * Payment submission deadline set by the manager at approval time.
     * If the student does not call {@code POST /bookings/{id}/payment} before
     * this timestamp, the sweeper automatically expires the booking.
     * Null for PENDING/REJECTED/CANCELLED bookings.
     */
    @Column(name = "payment_expires_at")
    private LocalDateTime paymentExpiresAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejected_reason", columnDefinition = "TEXT")
    private String rejectedReason;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @Column(name = "checked_out_at")
    private LocalDateTime checkedOutAt;

    /**
     * Informational amount declared by the student. Not validated against a gateway.
     */
    @Column(name = "amount_paid", precision = 10, scale = 2)
    private BigDecimal amountPaid;

    /**
     * External payment reference (MTN Mobile Money ID, bank slip number, etc.).
     * Must be present for the manager to check the student in.
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
    // Factory method
    // -------------------------------------------------------------------------

    /**
     * Constructs a new PENDING booking. The service is responsible for saving it.
     *
     * @param request the validated booking request from the student
     * @param student the authenticated student entity
     * @param room    the room being requested
     */
    public static Booking createBooking(CreateBookingRequest request, User student, Room room) {
        var booking = new Booking();
        booking.setStudent(student);
        booking.setRoom(room);
        booking.setStatus(BookingStatus.PENDING);
        booking.setAcademicYear(request.academicYear());
        booking.setSemester(request.semester());
        booking.setRequestedAt(LocalDateTime.now());
        return booking;
    }
}