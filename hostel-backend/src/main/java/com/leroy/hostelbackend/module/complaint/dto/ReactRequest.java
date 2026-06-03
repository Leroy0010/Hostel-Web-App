package com.leroy.hostelbackend.module.complaint.dto;

import jakarta.validation.constraints.NotNull;

/** Vote on a complaint. */
public record ReactRequest(
        @NotNull(message = "isUpvote must be true or false")
        Boolean isUpvote
) {}
