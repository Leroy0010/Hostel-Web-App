package com.leroy.hostelbackend.shared.validation;

import jakarta.validation.ConstraintValidator;

import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

    // At least 8 chars, max 72 (bcrypt limit), uppercase, lowercase, digit, special char
    private static final Pattern STRONG_PASSWORD = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_.\\-])[A-Za-z\\d@$!%*?&_.\\-]{8,72}$"
    );

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return false;
        return STRONG_PASSWORD.matcher(value).matches();
    }
}
