package com.leroy.hostelbackend.module.analytics.dto;

/**
 * Occupancy breakdown for a single hostel.
 *
 * @param hostelId          hostel UUID
 * @param hostelName        hostel display name
 * @param totalRooms        number of rooms (all statuses)
 * @param totalBeds         sum of bed capacity
 * @param occupiedBeds      beds with APPROVED or CHECKED_IN bookings
 * @param occupancyPct      occupiedBeds / totalBeds × 100
 * @param waitlistCount     students currently waiting for this hostel
 * @param pendingBookings   bookings in PENDING state for this hostel
 */
public record HostelOccupancyDto(
        String  hostelId,
        String  hostelName,
        long    totalRooms,
        long    totalBeds,
        long    occupiedBeds,
        double  occupancyPct,
        long    waitlistCount,
        long    pendingBookings
) {}
