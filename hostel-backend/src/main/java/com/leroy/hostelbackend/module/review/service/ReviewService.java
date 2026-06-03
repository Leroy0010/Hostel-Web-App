package com.leroy.hostelbackend.module.review.service;

import com.leroy.hostelbackend.module.booking.model.BookingStatus;
import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.hostel.repository.HostelRepository;
import com.leroy.hostelbackend.module.review.dto.*;
import com.leroy.hostelbackend.module.review.mapper.ReviewMapper;
import com.leroy.hostelbackend.module.review.model.Review;
import com.leroy.hostelbackend.module.review.repository.ReviewRepository;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.exception.HostelAccessDeniedException;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Manages hostel reviews with a strict authenticity gate.
 *
 * <p><strong>Authenticity rules enforced before saving a review:</strong>
 * <ol>
 *   <li>The supplied {@code bookingId} must belong to the authenticated student —
 *       prevents reviewing on behalf of someone else.</li>
 *   <li>The booking's hostel must match the {@code hostelId} in the request —
 *       prevents using a booking for Hostel A to review Hostel B.</li>
 *   <li>The booking status must be {@code CHECKED_IN} or {@code CHECKED_OUT} —
 *       a student with only a PENDING or APPROVED booking has not yet stayed.</li>
 *   <li>The student must not already have a review for this hostel (one per hostel,
 *       enforced by DB UNIQUE constraint and checked explicitly for a clear error).</li>
 *   <li>The booking must not already be attached to another review (prevents
 *       submitting two reviews using the same booking ID via different requests).</li>
 * </ol>
 *
 * <p><strong>Updates:</strong> Only the author can update their own review.
 * Patch semantics — null fields are ignored.
 *
 * <p><strong>Deletion:</strong> Authors can delete their own reviews. Admins can
 * delete any review (e.g., for content moderation).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewService {

    private final ReviewRepository  reviewRepository;
    private final BookingRepository bookingRepository;
    private final HostelRepository  hostelRepository;
    private final UserRepository    userRepository;
    private final ReviewMapper      reviewMapper;

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Submits a new review after passing all authenticity checks.
     *
     * @param authorId the authenticated student's UUID
     * @param request  validated review payload
     * @return the persisted {@link ReviewDto}
     * @throws IllegalStateException    if the booking status is not CHECKED_IN/CHECKED_OUT,
     *                                  or if the student already reviewed this hostel,
     *                                  or if the booking was already used for a review
     * @throws IllegalArgumentException if the booking's hostel does not match the request hostel
     * @throws HostelAccessDeniedException if the booking does not belong to the student
     */
    @Transactional
    public ReviewDto createReview(UUID authorId, CreateReviewRequest request) {

        var author  = userRepository.findById(authorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authorId));
        var hostel  = hostelRepository.findById(request.hostelId())
                .orElseThrow(() -> new ResourceNotFoundException("Hostel not found: " + request.hostelId()));
        var booking = bookingRepository.findByIdWithDetails(request.bookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + request.bookingId()));

        // ── Gate 1: booking must belong to this student ──────────────────────
        if (!booking.getStudent().getId().equals(authorId)) {
            throw new HostelAccessDeniedException();
        }

        // ── Gate 2: booking must be for the same hostel being reviewed ────────
        if (!booking.getRoom().getHostel().getId().equals(request.hostelId())) {
            throw new IllegalArgumentException(
                    "The provided booking is not associated with hostel '" + hostel.getName() + "'.");
        }

        // ── Gate 3: booking status must be CHECKED_IN or CHECKED_OUT ─────────
        var status = booking.getStatus();
        if (status != BookingStatus.CHECKED_IN && status != BookingStatus.CHECKED_OUT) {
            throw new IllegalStateException(
                    "You can only review a hostel after you have checked in or checked out. " +
                            "Current booking status: " + status.name() + ".");
        }

        // ── Gate 4: one review per student per hostel ─────────────────────────
        if (reviewRepository.existsByAuthorIdAndHostelId(authorId, request.hostelId())) {
            throw new IllegalStateException(
                    "You have already submitted a review for '" + hostel.getName() + "'.");
        }

        // ── Gate 5: booking must not already be used for another review ───────
        if (reviewRepository.existsByBookingId(request.bookingId())) {
            throw new IllegalStateException(
                    "This booking has already been used to submit a review.");
        }

        var review = new Review();
        review.setAuthor(author);
        review.setHostel(hostel);
        review.setBooking(booking);
        review.setRating(request.rating().shortValue());
        review.setComment(request.comment());

        var saved = reviewRepository.save(review);
        log.info("Review created: id={}, author={}, hostel={}, rating={}",
                saved.getId(), authorId, request.hostelId(), request.rating());
        return reviewMapper.toDto(saved);
    }

    // -------------------------------------------------------------------------
    // Update (author only, patch semantics)
    // -------------------------------------------------------------------------

    /**
     * Updates rating and/or comment. Only the author can do this.
     * Null fields in the request are ignored.
     *
     * @param reviewId  UUID of the review to update
     * @param authorId  must match the review's author
     * @param request   partial update payload
     */
    @Transactional
    public ReviewDto updateReview(UUID reviewId, UUID authorId, UpdateReviewRequest request) {
        var review = requireReview(reviewId);

        if (!review.getAuthor().getId().equals(authorId)) {
            throw new HostelAccessDeniedException();
        }

        if (request.rating()  != null) review.setRating(request.rating().shortValue());
        if (request.comment() != null) review.setComment(request.comment());

        var saved = reviewRepository.save(review);
        log.info("Review updated: id={}, author={}", reviewId, authorId);
        return reviewMapper.toDto(saved);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    /**
     * Deletes a review. Authors can delete their own; admins can delete any.
     *
     * @param reviewId      the review to delete
     * @param requesterId   the authenticated user's UUID
     * @param isAdmin       {@code true} if the caller has ADMIN role
     */
    @Transactional
    public void deleteReview(UUID reviewId, UUID requesterId, boolean isAdmin) {
        var review = requireReview(reviewId);

        if (!isAdmin && !review.getAuthor().getId().equals(requesterId)) {
            throw new HostelAccessDeniedException();
        }

        reviewRepository.delete(review);
        log.info("Review deleted: id={}, deletedBy={}", reviewId, requesterId);
    }

    // -------------------------------------------------------------------------
    // Read operations
    // -------------------------------------------------------------------------

    /**
     * Full review detail — any authenticated user can view a single review.
     */
    @Transactional(readOnly = true)
    public ReviewDto getReviewById(UUID reviewId) {
        return reviewMapper.toDto(requireReview(reviewId));
    }

    /**
     * Paginated public review feed for a hostel.
     * Newest reviews first by default.
     */
    @Transactional(readOnly = true)
    public Page<ReviewSummaryDto> listReviewsByHostel(UUID hostelId, Pageable pageable) {
        if (!hostelRepository.existsById(hostelId)) {
            throw new ResourceNotFoundException("Hostel not found: " + hostelId);
        }
        return reviewRepository.findByHostelId(hostelId, pageable)
                .map(reviewMapper::toSummaryDto);
    }

    /**
     * All reviews written by the authenticated student.
     */
    @Transactional(readOnly = true)
    public Page<ReviewSummaryDto> myReviews(UUID authorId, Pageable pageable) {
        return reviewRepository.findByAuthorId(authorId, pageable)
                .map(reviewMapper::toSummaryDto);
    }

    /**
     * Aggregate rating card for a hostel — average score and total count.
     * Returns average {@code null} and count {@code 0} if no reviews exist yet.
     */
    @Transactional(readOnly = true)
    public HostelRatingDto getHostelRating(UUID hostelId) {
        if (!hostelRepository.existsById(hostelId)) {
            throw new ResourceNotFoundException("Hostel not found: " + hostelId);
        }
        Double avg   = reviewRepository.findAverageRatingByHostelId(hostelId);
        long   count = reviewRepository.countByHostelId(hostelId);
        return new HostelRatingDto(hostelId, avg, count);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private Review requireReview(UUID id) {
        return reviewRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + id));
    }
}