package com.leroy.hostelbackend.module.review.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Full review detail returned to the client.
 *
 * @param id         review UUID
 * @param author     nested author summary
 * @param hostelId   UUID of the reviewed hostel
 * @param hostelName display name of the hostel
 * @param bookingId  the qualifying booking UUID
 * @param rating     1–5 star rating
 * @param comment    optional free-text body
 * @param createdAt  timestamp of submission
 */
public record ReviewDto(
        UUID         id,
        AuthorSummary author,
        UUID         hostelId,
        String       hostelName,
        UUID         bookingId,
        short        rating,
        String       comment,
        LocalDateTime createdAt
) {
    /**
     * Minimal author info embedded in the review response.
     * Never exposes password, FCM token, or other sensitive fields.
     */
    public record AuthorSummary(UUID id, String firstName, String lastName) {}
}
