package com.leroy.hostelbackend.module.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * Request body for updating an existing review (patch semantics — null = no change).
 *
 * @param rating  new star rating (optional)
 * @param comment new comment text (optional)
 */
public record UpdateReviewRequest(

        @Min(value = 1, message = "Rating must be at least 1")
        @Max(value = 5, message = "Rating must not exceed 5")
        Integer rating,

        @Size(max = 2000, message = "Comment must not exceed 2000 characters")
        String comment
) {}
