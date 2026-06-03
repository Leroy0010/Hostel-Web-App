package com.leroy.hostelbackend.module.analytics.dto;

import java.math.BigDecimal; /**
 * Revenue summary — informational only (no real payments).
 * Shows declared payment amounts from {@code bookings.amount_paid}.
 *
 * @param totalDeclared   sum of all non-null {@code amount_paid} values (all time)
 * @param currentSemester sum for the current academic period (passed as a param)
 * @param paidBookings    number of bookings where a payment ref has been submitted
 * @param unpaidApproved  approved bookings without a payment reference yet
 */
public record RevenueSummaryDto(
        BigDecimal totalDeclared,
        BigDecimal currentSemester,
        long       paidBookings,
        long       unpaidApproved
) {}
