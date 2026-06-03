package com.leroy.hostelbackend.module.complaint.model;

import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.room.model.Room;
import com.leroy.hostelbackend.module.user.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A student-raised support ticket targeting a room or an entire hostel.
 *
 * <p>{@code roomId} is nullable — hostel-wide issues (generator, water outage)
 * don't belong to a specific room.
 *
 * <p>Status transitions (enforced in {@code ComplaintService}):
 * <pre>
 *   OPEN → IN_PROGRESS (manager acknowledges)
 *   IN_PROGRESS → RESOLVED (manager marks fixed)
 *   RESOLVED → CLOSED (auto or admin)
 *   OPEN → CLOSED (admin closes invalid ticket)
 * </pre>
 */
@Getter
@Setter
@Entity
@Table(name = "complaints")
public class Complaint {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hostel_id", nullable = false)
    private Hostel hostel;

    /** Nullable — null means the complaint is hostel-wide. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", nullable = false)
    private String description;

    /**
     * OPEN | IN_PROGRESS | RESOLVED | CLOSED
     * Stored as VARCHAR — Java enum {@link ComplaintStatus} is the enforcer.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ComplaintStatus status = ComplaintStatus.OPEN;

    /**
     * MAINTENANCE | CLEANLINESS | SECURITY | NOISE | BILLING | OTHER
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private ComplaintCategory category = ComplaintCategory.OTHER;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}


