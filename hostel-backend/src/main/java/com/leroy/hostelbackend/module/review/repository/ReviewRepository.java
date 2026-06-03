package com.leroy.hostelbackend.module.review.repository;

import com.leroy.hostelbackend.module.review.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Review} entities.
 *
 * <p>All list queries JOIN FETCH the {@code author} so the mapper never triggers
 * secondary SELECT statements (N+1 prevention).
 */
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    /**
     * Full review detail with author loaded. Used for single-review fetch and edits.
     */
    @Query("""
            SELECT r FROM Review r
            JOIN FETCH r.author
            JOIN FETCH r.hostel
            JOIN FETCH r.booking
            WHERE r.id = :id
            """)
    Optional<Review> findByIdWithDetails(@Param("id") UUID id);

    /**
     * All reviews for a hostel — public review feed.
     * Sorted newest-first by default; caller can override via {@code pageable}.
     */
    @Query("""
            SELECT r FROM Review r
            JOIN FETCH r.author
            WHERE r.hostel.id = :hostelId
            ORDER BY r.createdAt DESC
            """)
    Page<Review> findByHostelId(@Param("hostelId") UUID hostelId, Pageable pageable);

    /**
     * A student's own reviews across all hostels.
     */
    @Query("""
            SELECT r FROM Review r
            JOIN FETCH r.hostel
            WHERE r.author.id = :authorId
            ORDER BY r.createdAt DESC
            """)
    Page<Review> findByAuthorId(@Param("authorId") UUID authorId, Pageable pageable);

    /**
     * Lightweight duplicate check. Used before persisting to give a clear error
     * instead of a raw DB constraint violation.
     */
    boolean existsByAuthorIdAndHostelId(UUID authorId, UUID hostelId);

    /**
     * Check whether a specific booking has already been used to write a review.
     * Prevents a student from leaving two reviews for the same stay by using
     * different bookings (if they somehow had more than one for the same hostel).
     */
    boolean existsByBookingId(UUID bookingId);

    /**
     * Average rating for a hostel — used in the hostel detail DTO.
     * Returns {@code null} if no reviews exist yet.
     */
    @Query("SELECT AVG(CAST(r.rating AS double)) FROM Review r WHERE r.hostel.id = :hostelId")
    Double findAverageRatingByHostelId(@Param("hostelId") UUID hostelId);

    /** Total review count for a hostel. */
    long countByHostelId(UUID hostelId);
}