package com.leroy.hostelbackend.module.review.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lightweight summary used in the hostel detail page alongside the aggregate rating.
 */
public record ReviewSummaryDto(
        UUID   id,
        UUID   authorId,
        String authorName,
        short  rating,
        String comment,
        LocalDateTime createdAt
) {}
