package com.leroy.hostelbackend.module.auth.dto;

import com.leroy.hostelbackend.shared.validation.StrongPassword;
import jakarta.validation.constraints.NotBlank;

public record PasswordResetConfirmRequest(
        @NotBlank(message = "Token required") String token,
        @StrongPassword String newPassword,
        @NotBlank(message = "Type required") String type
) {}
