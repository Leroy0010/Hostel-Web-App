package com.leroy.hostelbackend.shared.exception;

import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Centralised exception → HTTP response mapper.
 *
 * <p>Every handler produces an {@link ApiError} with a consistent shape.
 * More specific exception types are listed first so they shadow the generic
 * catch-all at the bottom.
 */
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // -------------------------------------------------------------------------
    // 400 — Bad Request / Input
    // -------------------------------------------------------------------------

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleNotReadable() {
        return build(HttpStatus.BAD_REQUEST, "Invalid or malformed request body.", null, ErrorCode.ILLEGAL_ARGUMENT);
    }

    /**
     * Bean Validation failures. Returns a map of {@code field → [messages]} so the
     * frontend can highlight exactly which fields failed.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, List<String>> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.groupingBy(
                        FieldError::getField,
                        Collectors.mapping(FieldError::getDefaultMessage, Collectors.toList())
                ));
        return build(HttpStatus.BAD_REQUEST, "Validation failed.", fieldErrors, ErrorCode.VALIDATION_FAILED);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Illegal argument: {}", ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), null, ErrorCode.ILLEGAL_ARGUMENT);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiError> handleIllegalState(IllegalStateException ex, HttpServletResponse response) {
        if (response.isCommitted()) return null;
        log.warn("Illegal state: {}", ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), null, ErrorCode.ILLEGAL_STATE);
    }

    // -------------------------------------------------------------------------
    // 402 — Payment Required
    // -------------------------------------------------------------------------

    @ExceptionHandler(PaymentFailedException.class)
    public ResponseEntity<ApiError> handlePaymentFailed(PaymentFailedException ex) {
        return build(HttpStatus.PAYMENT_REQUIRED, ex.getMessage(), null, ErrorCode.PAYMENT_FAILED);
    }

    // -------------------------------------------------------------------------
    // 403 — Forbidden
    // -------------------------------------------------------------------------

    @ExceptionHandler(UserDeactivatedException.class)
    public ResponseEntity<ApiError> handleDeactivated(UserDeactivatedException ex) {
        return build(HttpStatus.FORBIDDEN, ex.getMessage(), null, ErrorCode.USER_DEACTIVATED);
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiError> handleDisabled() {
        return build(HttpStatus.FORBIDDEN, "This account has been deactivated. Please contact administration.", null, ErrorCode.USER_DEACTIVATED);
    }

    @ExceptionHandler(HostelAccessDeniedException.class)
    public ResponseEntity<ApiError> handleHostelAccess(HostelAccessDeniedException ex) {
        return build(HttpStatus.FORBIDDEN, ex.getMessage(), null, ErrorCode.FORBIDDEN);
    }

    @ExceptionHandler({UsernameNotFoundException.class, AccessDeniedException.class, AuthorizationDeniedException.class})
    public ResponseEntity<ApiError> handleAccessDenied(Exception ex, HttpServletResponse response) {
        if (response.isCommitted()) return null;
        log.warn("Access denied: {}", ex.getMessage());
        return build(HttpStatus.FORBIDDEN, "Access denied. You do not have permission to access this resource.", null, ErrorCode.FORBIDDEN);
    }

    // -------------------------------------------------------------------------
    // 404 — Not Found
    // -------------------------------------------------------------------------

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), null, ErrorCode.RESOURCE_NOT_FOUND);
    }

    // -------------------------------------------------------------------------
    // 409 — Conflict
    // -------------------------------------------------------------------------

    @ExceptionHandler(RoomFullyOccupiedException.class)
    public ResponseEntity<ApiError> handleRoomFull(RoomFullyOccupiedException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), null, ErrorCode.ROOM_FULLY_OCCUPIED);
    }

    @ExceptionHandler(BookingAlreadyExistsException.class)
    public ResponseEntity<ApiError> handleBookingExists(BookingAlreadyExistsException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), null, ErrorCode.BOOKING_ALREADY_EXISTS);
    }

    @ExceptionHandler(InvalidBookingTransitionException.class)
    public ResponseEntity<ApiError> handleBadTransition(InvalidBookingTransitionException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), null, ErrorCode.INVALID_BOOKING_TRANSITION);
    }

    @ExceptionHandler(AlreadyOnWaitlistException.class)
    public ResponseEntity<ApiError> handleWaitlist(AlreadyOnWaitlistException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), null, ErrorCode.ALREADY_ON_WAITLIST);
    }

    @ExceptionHandler(DuplicateRoomNumberException.class)
    public ResponseEntity<ApiError> handleDuplicateRoom(DuplicateRoomNumberException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), null, ErrorCode.DUPLICATE_ROOM_NUMBER);
    }

    /**
     * Hibernate optimistic lock failure — two concurrent transactions raced to book the
     * same room. Surface as a 409 with the room-full message so the frontend can prompt
     * the student to choose another room or join the waitlist.
     */
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiError> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        log.warn("Optimistic lock conflict on {}: {}", ex.getPersistentClassName(), ex.getMessage());
        return build(HttpStatus.CONFLICT,
                "This room was just booked by another student. Please select a different room or join the waitlist.",
                null, ErrorCode.ROOM_FULLY_OCCUPIED);
    }

    // -------------------------------------------------------------------------
    // 429 — Rate Limiting
    // -------------------------------------------------------------------------

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ApiError> handleRateLimit(RateLimitExceededException ex) {
        return build(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage(), null, ErrorCode.TOO_MANY_REQUESTS);
    }

    // -------------------------------------------------------------------------
    // 500 — Catch-all
    // -------------------------------------------------------------------------

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleAll(Exception ex, HttpServletResponse response) {
        if (response.isCommitted()) {
            log.warn("Response already committed. Suppressing: {}", ex.getMessage());
            return null;
        }
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.", null, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    // -------------------------------------------------------------------------
    // Builder
    // -------------------------------------------------------------------------

    private ResponseEntity<ApiError> build(HttpStatus status, String message,
                                           Map<String, List<String>> details, ErrorCode code) {
        return ResponseEntity.status(status).body(new ApiError(
                LocalDateTime.now(), status.value(), status.getReasonPhrase(), message, details, code
        ));
    }
}