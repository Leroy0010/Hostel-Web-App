package com.leroy.hostelbackend.module.analytics.dto;

import java.math.BigDecimal;
import java.util.List;

// =============================================================================
// Analytics DTOs
// All are records — immutable, zero boilerplate.
// =============================================================================

/**
 * Top-level system overview — the admin landing page dashboard card.
 *
 * @param totalHostels      all hostels (active + inactive)
 * @param activeHostels     currently active hostels
 * @param totalRooms        all rooms across all active hostels
 * @param totalBeds         sum of all bed capacity across active rooms
 * @param occupiedBeds      beds currently occupied (APPROVED + CHECKED_IN bookings)
 * @param availableBeds     totalBeds - occupiedBeds
 * @param overallOccupancyPct  occupiedBeds / totalBeds × 100, rounded to 1 dp
 * @param totalStudents     all registered STUDENT accounts
 * @param pendingBookings   bookings awaiting manager action
 * @param openComplaints    complaints with status OPEN
 * @param totalWaitlisted   students currently on any waitlist
 */
public record SystemOverviewDto(
        long    totalHostels,
        long    activeHostels,
        long    totalRooms,
        long    totalBeds,
        long    occupiedBeds,
        long    availableBeds,
        double  overallOccupancyPct,
        long    totalStudents,
        long    pendingBookings,
        long    openComplaints,
        long    totalWaitlisted
) {}


