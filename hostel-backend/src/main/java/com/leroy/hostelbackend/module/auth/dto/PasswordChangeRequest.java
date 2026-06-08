package com.leroy.hostelbackend.module.auth.dto;

import com.leroy.hostelbackend.shared.validation.StrongPassword;
import jakarta.validation.constraints.NotBlank;

public record PasswordChangeRequest(
        @NotBlank(message = "Current password required") String currentPassword,
        @StrongPassword String newPassword
) {}

