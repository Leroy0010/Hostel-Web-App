package com.leroy.hostelbackend.module.complaint.dto;

import com.leroy.hostelbackend.module.complaint.model.ComplaintCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

// =============================================================================
// Complaint DTOs
// =============================================================================

/** Create a new complaint. */
public record CreateComplaintRequest(
        @NotNull(message = "Hostel ID is required")
        UUID hostelId,

        UUID roomId,   // optional — null for hostel-wide complaints

        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must not exceed 200 characters")
        String title,

        @NotBlank(message = "Description is required")
        String description,

        @NotNull(message = "Category is required")
        ComplaintCategory category
) {}


