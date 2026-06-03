package com.leroy.hostelbackend.module.complaint.dto;

import com.leroy.hostelbackend.module.complaint.model.ComplaintStatus;
import jakarta.validation.constraints.NotNull;

/** Manager/admin status update request. */
public record UpdateComplaintStatusRequest(
        @NotNull(message = "Status is required")
        ComplaintStatus status
) {}
