package com.leroy.hostelbackend.module.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PasswordResetRequest(
        @NotBlank @Email(message = "Please provide a valid email address.") String email
) {}
