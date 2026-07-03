package com.leroy.hostelbackend.shared.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;
import java.util.stream.Stream;

public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

    // 1. Separate individual pattern rules
    private static final Pattern UPPER = Pattern.compile("[A-Z]");
    private static final Pattern LOWER = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("\\d");
    // Matches common special characters including the ones from your original regex
    private static final Pattern SPECIAL = Pattern.compile("[@$!%*?&_.\\-]");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // 2. Reject nulls or invalid lengths immediately
        if (value == null || value.length() < 8 || value.length() > 72) {
            return false;
        }

        // 3. Count how many individual conditions are met
        long conditionsMet = Stream.of(
            UPPER.matcher(value).find(),
            LOWER.matcher(value).find(),
            DIGIT.matcher(value).find(),
            SPECIAL.matcher(value).find()
        ).filter(matched -> matched).count();

        // 4. Pass if 2 or more conditions are true
        return conditionsMet >= 2;
    }
}
