package com.leroy.hostelbackend.module.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

/**
 * Request body for {@code POST /auth/login}.
 *
 * <p><strong>Why were validation annotations missing before?</strong><br>
 * Without {@code @NotBlank} / {@code @Email}, a misspelled field name in the JSON
 * body (e.g. {@code "emal"} instead of {@code "email"}) results in {@code null} being
 * passed silently to the {@link org.springframework.security.authentication.AuthenticationManager}.
 * Spring Security then fails with a {@link org.springframework.security.authentication.BadCredentialsException},
 * which the controller's {@code @ExceptionHandler} maps to {@code 401 Unauthorized} —
 * when the real problem is a malformed request that deserves {@code 400 Bad Request}.
 *
 * <p>Adding {@code @Valid} + these constraints means Jackson/Spring Validation fires
 * <em>before</em> authentication is even attempted, and a misspelled field produces
 * a proper {@code 400} with a clear field-level error message via
 * {@link com.leroy.hostelbackend.shared.exception.GlobalExceptionHandler#handleValidationException}.
 */
@Getter
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;
}