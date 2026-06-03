package com.leroy.hostelbackend.module.user.dto;

import com.leroy.hostelbackend.shared.validation.StrongPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;

/**
 * Request body for student self-registration ({@code POST /users}).
 *
 * <p>Phone number is <strong>optional</strong> for students. If provided, it is
 * validated to contain only digits, spaces, {@code +}, {@code -}, and parentheses
 * and must be between 7 and 20 characters — enough to cover international formats.
 *
 * <p>Password constraints:
 * <ul>
 *   <li>Minimum 8 characters</li>
 *   <li>Maximum 72 characters — BCrypt silently truncates at 72; we enforce this
 *       so users are not surprised when a 100-character password works the same
 *       as its first 72 characters.</li>
 * </ul>
 */
@Getter
public class CreateStudentRequest {

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
    @StrongPassword
    private String password;

    /**
     * Optional for student self-registration.
     * Accepts international formats: {@code +233541234567}, {@code 0541234567}, etc.
     */
    @Pattern(
            regexp = "^[\\d\\s+\\-()]{7,20}$",
            message = "Phone number must be between 7 and 20 characters and contain only digits, spaces, +, -, or parentheses"
    )
    private String phone;
}