package com.leroy.hostelbackend.module.user.dto;

import com.leroy.hostelbackend.module.user.model.UserRole;
import jakarta.validation.constraints.*;
import lombok.Getter;

/**
 * Request body for admin-created staff accounts ({@code POST /admin/users}).
 *
 * <p>Only an {@code ADMIN} can hit this endpoint. The {@code role} field must be
 * either {@link UserRole#MANAGER} or {@link UserRole#ADMIN} — students self-register
 * via {@link CreateStudentRequest} and the {@code POST /users} endpoint.
 *
 * <p>Phone number is <strong>required</strong> for staff accounts so managers and
 * admins can be reached directly by the system administrator.
 */
@Getter
public class CreateStaffRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must not exceed 100 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must not exceed 100 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
    private String password;

    /**
     * Required for all staff accounts (MANAGER and ADMIN).
     */
    @NotBlank(message = "Phone number is required for staff accounts")
    @Pattern(
            regexp = "^[\\d\\s+\\-()]{7,20}$",
            message = "Phone number must be between 7 and 20 characters and contain only digits, spaces, +, -, or parentheses"
    )
    private String phone;

    /**
     * Must be {@link UserRole#MANAGER} or {@link UserRole#ADMIN}.
     * {@link UserRole#STUDENT} is rejected at the service layer — students self-register.
     */
    @NotNull(message = "Role is required")
    private UserRole role;
}