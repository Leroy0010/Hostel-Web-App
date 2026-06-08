package com.leroy.hostelbackend.module.waitlist.model;

import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.user.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A student's queued position for a specific hostel and academic period.
 *
 * <p><strong>Period-scoped:</strong> The waitlist is now per {@code (hostelId, academicYear, semester)}.
 * A student can be on the waitlist for Hostel A for FIRST semester AND for SECOND semester
 * simultaneously. This matches the period-scoped booking model so a freed bed for a specific
 * period notifies only students waiting for that same period.
 *
 * <p><strong>Auto-drafting:</strong> When {@code notifyNextInLine} is called, this service
 * no longer just sends a push notification — it auto-creates a PENDING booking for the
 * student and removes them from the waitlist. The manager then sees a flagged
 * ({@code isWaitlistDraft = true}) PENDING booking on their dashboard and simply approves or rejects.
 *
 * <p><strong>Position integrity:</strong> Positions are 1-based and kept contiguous.
 * Every removal calls {@link WaitlistRepository#decrementPositionsAfter} in the same transaction.
 */
@Getter
@Setter
@Entity
@Table(name = "waitlists")
public class Waitlist {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hostel_id", nullable = false)
    private Hostel hostel;

    /** 1-based rank within this hostel+period queue. Managed by {@code WaitlistService} only. */
    @Column(name = "position", nullable = false)
    private Integer position;

    /**
     * The academic year the student is waiting for, e.g. "2025/2026".
     * Matches the {@code academicYear} on the booking that will be created on promotion.
     */
    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    /**
     * The semester the student is waiting for: FIRST | SECOND | FULL.
     * Matches the {@code semester} on the booking that will be created on promotion.
     */
    @Column(name = "semester", nullable = false)
    private String semester;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    /**
     * Set to {@code true} once the student has been promoted (auto-draft created).
     * After promotion the waitlist entry is deleted, so this flag is mainly for
     * in-flight audit purposes.
     */
    @Column(name = "notified", nullable = false)
    private Boolean notified = false;
}