package com.leroy.hostelbackend.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 2, message = "First name must be at least 2 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, message = "Last name must be at least 2 characters")
    private String lastName;

    // Optional depending on your business rules, but good to cap length

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