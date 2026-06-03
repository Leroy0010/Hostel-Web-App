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
 * A student's queued position for a specific hostel.
 *
 * <p><strong>Position semantics:</strong> 1-based rank within this hostel's waitlist.
 * Position 1 is the next student notified when a bed opens. The service re-ranks
 * remaining entries after a promotion or voluntary removal.
 *
 * <p><strong>notified flag:</strong> Set to {@code true} once a push notification
 * has been dispatched. Reset to {@code false} if a new vacancy appears and the
 * student still hasn't booked (so they can be re-notified next time).
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

    /** 1-based rank. Managed exclusively by {@code WaitlistService}. */
    @Column(name = "position", nullable = false)
    private Integer position;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    /**
     * {@code true} after a Firebase push has been sent for this entry.
     * Prevents repeat notifications until the next vacancy cycle.
     */
    @Column(name = "notified", nullable = false)
    private Boolean notified = false;
}