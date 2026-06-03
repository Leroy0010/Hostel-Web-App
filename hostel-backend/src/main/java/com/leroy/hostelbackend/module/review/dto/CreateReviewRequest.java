package com.leroy.hostelbackend.module.review.dto;

import jakarta.validation.constraints.*;

import java.util.UUID;

// =============================================================================
// Review DTOs
// =============================================================================

/**
 * Request body for creating a new review.
 *
 * <p>The {@code bookingId} is the proof-of-stay anchor. The service validates
 * that it belongs to the authenticated student and targets the correct hostel
 * before allowing the review to be saved.
 *
 * @param hostelId  the hostel being reviewed
 * @param bookingId the qualifying booking (must be CHECKED_IN or CHECKED_OUT)
 * @param rating    star rating 1–5
 * @param comment   optional free-text body
 */
public record CreateReviewRequest(

        @NotNull(message = "Hostel ID is required")
        UUID hostelId,

        @NotNull(message = "Booking ID is required — this proves you stayed at this hostel")
        UUID bookingId,

        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be at least 1")
        @Max(value = 5, message = "Rating must not exceed 5")
        Integer rating,

        @Size(max = 2000, message = "Comment must not exceed 2000 characters")
        String comment
) {}


