package com.leroy.hostelbackend.shared.exception;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record ApiError(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        Map<String, List<String>> details, // field -> list of error messages
        ErrorCode code
) {}
