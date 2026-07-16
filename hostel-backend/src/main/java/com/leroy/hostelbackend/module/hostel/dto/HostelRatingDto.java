package com.leroy.hostelbackend.module.hostel.dto;

/**
 * Aggregate rating information returned as part of the hostel detail DTO
 * and as a standalone endpoint for the hostel rating card.
 *
 * @param averageRating  mean of all submitted ratings, or null if no reviews yet
 * @param totalReviews   total number of reviews submitted
 */
public record HostelRatingDto(
        Double averageRating,
        long   totalReviews
) {}
