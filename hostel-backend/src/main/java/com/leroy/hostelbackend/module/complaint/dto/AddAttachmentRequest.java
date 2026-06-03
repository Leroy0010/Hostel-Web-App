package com.leroy.hostelbackend.module.complaint.dto;

import jakarta.validation.constraints.NotBlank;

/** Add a single file attachment (S3 URL from a prior upload). */
public record AddAttachmentRequest(
        @NotBlank(message = "File URL is required")
        String fileUrl,

        String fileType   // optional MIME type
) {}
