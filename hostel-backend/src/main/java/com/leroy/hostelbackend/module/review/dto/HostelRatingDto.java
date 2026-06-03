package com.leroy.hostelbackend.module.review.dto;

import java.util.UUID;

/**
 * Aggregate rating information returned as part of the hostel detail DTO
 * and as a standalone endpoint for the hostel rating card.
 *
 * @param hostelId       UUID of the hostel
 * @param averageRating  mean of all submitted ratings, or null if no reviews yet
 * @param totalReviews   total number of reviews submitted
 */
public record HostelRatingDto(
        UUID   hostelId,
        Double averageRating,
        long   totalReviews
) {}
