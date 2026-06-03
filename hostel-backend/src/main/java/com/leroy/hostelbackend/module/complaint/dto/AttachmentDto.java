package com.leroy.hostelbackend.module.complaint.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** Attachment embedded in ComplaintDto. */
public record AttachmentDto(
        UUID id,
        String fileUrl,
        String fileType,
        LocalDateTime uploadedAt
) {}
