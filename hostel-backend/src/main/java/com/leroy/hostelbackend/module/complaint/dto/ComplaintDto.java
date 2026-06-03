package com.leroy.hostelbackend.module.complaint.dto;

import com.leroy.hostelbackend.module.complaint.model.ComplaintCategory;
import com.leroy.hostelbackend.module.complaint.model.ComplaintStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Full complaint detail. */
public record ComplaintDto(
        UUID id,
        AuthorSummary author,
        UUID hostelId,
        String hostelName,
        UUID roomId,
        String roomNumber,
        String title,
        String description,
        ComplaintStatus status,
        ComplaintCategory category,
        long upvotes,
        long downvotes,
        long netScore,
        Boolean currentUserVote,   // null = not voted; true = upvoted; false = downvoted
        List<AttachmentDto> attachments,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime resolvedAt
) {
    public record AuthorSummary(UUID id, String firstName, String lastName) {}
}
