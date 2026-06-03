package com.leroy.hostelbackend.module.booking.dto;

import jakarta.validation.constraints.*;

/**
 * Request body for a manager approving or rejecting a PENDING booking.
 *
 * <p><strong>Grace period:</strong> When approving ({@code approved = true}),
 * the manager specifies how many hours the student has to submit their payment
 * reference before the system automatically expires the booking.
 *
 * <ul>
 *   <li>Minimum: 1 hour</li>
 *   <li>Maximum: 720 hours (30 days)</li>
 *   <li>Default (if omitted or null): 48 hours</li>
 * </ul>
 *
 * <p>This allows managers to set strict windows during high-demand periods
 * (e.g. 12 hours) and lenient windows during the off-season (e.g. 7 days = 168 hours).
 *
 * @param approved         {@code true} to approve, {@code false} to reject
 * @param rejectedReason   required when {@code approved = false}; validated in service
 * @param gracePeriodHours hours until the payment deadline expires (approval only);
 *                         ignored on rejection; defaults to 48 if null
 */
public record ActionBookingRequest(

        @NotNull(message = "Decision (approved: true/false) is required")
        Boolean approved,

        String rejectedReason,

        @Min(value = 1,   message = "Grace period must be at least 1 hour")
        @Max(value = 720, message = "Grace period must not exceed 720 hours (30 days)")
        Integer gracePeriodHours
) {
        /** Default grace period in hours when the manager does not specify one. */
        public static final int DEFAULT_GRACE_HOURS = 48;

        /**
         * Returns the effective grace period — the manager's value if provided,
         * otherwise the 48-hour default.
         */
        public int effectiveGracePeriodHours() {
                return (gracePeriodHours != null && gracePeriodHours > 0)
                        ? gracePeriodHours
                        : DEFAULT_GRACE_HOURS;
        }
}