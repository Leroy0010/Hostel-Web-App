package com.leroy.hostelbackend.module.booking.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;


/**
 * Request body for a student submitting their payment reference after approval.
 *
 * <p><strong>No payment processing occurs.</strong> The student supplies a reference
 * they already hold from an external transaction (e.g. MTN Mobile Money, bank deposit).
 * The manager verifies it offline before allowing check-in.
 *
 * @param paymentRef   the external transaction reference (max 100 chars)
 * @param amountPaid   informational — what the student declares they paid
 */
public record SubmitPaymentRequest(

        @NotBlank(message = "Payment reference is required")
        @Size(max = 100, message = "Payment reference must not exceed 100 characters")
        String paymentRef,

        @NotNull(message = "Amount paid is required")
        @DecimalMin(value = "0.01", message = "Amount paid must be greater than 0")
        BigDecimal amountPaid
) {}