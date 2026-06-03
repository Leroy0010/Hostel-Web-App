package com.leroy.hostelbackend.module.analytics.dto;

/**
 * Booking pipeline funnel — shows how requests move through the system.
 *
 * @param pending    awaiting manager decision
 * @param approved   approved, not yet checked in
 * @param rejected   rejected by manager
 * @param checkedIn  currently resident
 * @param checkedOut completed stays
 * @param cancelled  cancelled by student or system
 * @param total      grand total across all statuses
 */
public record BookingFunnelDto(
        long pending,
        long approved,
        long rejected,
        long checkedIn,
        long checkedOut,
        long cancelled,
        long total
) {}
