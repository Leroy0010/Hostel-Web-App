package com.leroy.hostelbackend.module.review.model;

import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.user.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A student review for a hostel they have genuinely stayed in.
 *
 * <p><strong>Authenticity gate:</strong> The {@code booking} FK is the proof of stay.
 * Before persisting a review, {@link com.leroy.hostelbackend.module.review.service.ReviewService}
 * verifies that:
 * <ol>
 *   <li>The booking belongs to the requesting student.</li>
 *   <li>The booking's hostel matches the review's target hostel.</li>
 *   <li>The booking status is {@code CHECKED_IN} or {@code CHECKED_OUT} — the student
 *       must have physically been allocated to the hostel, not just have a pending request.</li>
 * </ol>
 *
 * <p><strong>One review per student per hostel</strong> is enforced by the DB-level
 * {@code UNIQUE (author_id, hostel_id)} constraint. The service also checks this
 * explicitly to return a clear error rather than a raw constraint violation.
 *
 * <p>{@code rating} is 1–5, enforced by the DB {@code CHECK} constraint and the
 * DTO's {@code @Min}/{@code @Max} annotations.
 */
@Getter
@Setter
@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /**
     * The student who wrote the review.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.RESTRICT)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    /**
     * The hostel being reviewed.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "hostel_id", nullable = false)
    private Hostel hostel;

    /**
     * The booking that proves the reviewer actually stayed here.
     * {@code ON DELETE RESTRICT} — a booking cannot be deleted while a review references it.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.RESTRICT)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    /**
     * Star rating 1–5. Checked at DB level and in the DTO.
     */
    @Column(name = "rating", nullable = false)
    private Short rating;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}