package com.leroy.hostelbackend.module.complaint.dto;

import com.leroy.hostelbackend.module.complaint.model.ComplaintCategory;
import com.leroy.hostelbackend.module.complaint.model.ComplaintStatus;

import java.time.LocalDateTime;
import java.util.UUID;

/** Lightweight complaint summary for paginated lists. */
public record ComplaintSummaryDto(
        UUID id,
        String authorName,
        UUID hostelId,
        String hostelName,
        String title,
        ComplaintStatus status,
        ComplaintCategory category,
        long netScore,
        int attachmentCount,
        LocalDateTime createdAt
) {}
