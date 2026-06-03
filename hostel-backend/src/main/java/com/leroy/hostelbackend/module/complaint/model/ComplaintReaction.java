package com.leroy.hostelbackend.module.complaint.model;

import com.leroy.hostelbackend.module.user.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One upvote or downvote per user per complaint.
 * The DB-level UNIQUE(complaint_id, user_id) prevents duplicate votes.
 * Re-voting toggles {@code isUpvote} (UPSERT in service).
 */
@Getter
@Setter
@Entity
@Table(name = "complaint_reactions")
public class ComplaintReaction {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** {@code true} = upvote, {@code false} = downvote. */
    @Column(name = "is_upvote", nullable = false)
    private Boolean isUpvote;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
