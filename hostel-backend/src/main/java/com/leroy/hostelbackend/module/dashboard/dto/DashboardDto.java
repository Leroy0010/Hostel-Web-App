package com.leroy.hostelbackend.module.dashboard.dto;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.leroy.hostelbackend.module.analytics.dto.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Role-specific dashboard response container.
 *
 * <p>A single {@code GET /api/dashboard} endpoint returns different data
 * depending on the authenticated user's role. Jackson's {@code @JsonTypeInfo}
 * includes a {@code "role"} discriminator field so the frontend TypeScript
 * type system can narrow the union type correctly.
 *
 * <p>Three concrete implementations:
 * <ul>
 *   <li>{@link AdminDashboard} — system-wide overview for ADMIN users.</li>
 *   <li>{@link ManagerDashboard} — per-hostel view for MANAGER users.</li>
 *   <li>{@link StudentDashboard} — personal booking/waitlist view for STUDENTs.</li>
 * </ul>
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "role")
@JsonSubTypes({
        @JsonSubTypes.Type(value = DashboardDto.AdminDashboard.class,   name = "ADMIN"),
        @JsonSubTypes.Type(value = DashboardDto.ManagerDashboard.class, name = "MANAGER"),
        @JsonSubTypes.Type(value = DashboardDto.StudentDashboard.class, name = "STUDENT"),
})
public sealed interface DashboardDto
        permits DashboardDto.AdminDashboard,
        DashboardDto.ManagerDashboard,
        DashboardDto.StudentDashboard {

    // =========================================================================
    // ADMIN dashboard
    // =========================================================================

    /**
     * System-wide dashboard for ADMIN users.
     *
     * <p>Surfaces the key operational numbers an admin needs at a glance:
     * total users, occupancy rate, pending bookings queue, open complaints,
     * per-hostel occupancy breakdown, the booking funnel, and waitlist depth.
     *
     * @param role              always "ADMIN" (discriminator)
     * @param totalUsers        all registered user accounts
     * @param totalStudents     STUDENT accounts
     * @param totalManagers     MANAGER accounts
     * @param totalHostels      all hostels (active + inactive)
     * @param activeHostels     currently active hostels
     * @param totalRooms        rooms across all active hostels
     * @param totalBeds         sum of bed capacity across active rooms
     * @param occupiedBeds      APPROVED + CHECKED_IN
     * @param availableBeds     totalBeds - occupiedBeds
     * @param overallOccupancyPct  as a percentage, 1 decimal place
     * @param pendingBookings   PENDING bookings awaiting manager action
     * @param openComplaints    complaints with status OPEN
     * @param totalWaitlisted   students on any waitlist
     * @param hostelOccupancy   per-hostel breakdown (used for the occupancy table)
     * @param bookingFunnel     pipeline counts by status
     * @param complaintSummary  category + status breakdown
     * @param waitlistDepth     queue depth per hostel
     */
    record AdminDashboard(
            String               role,
            long                 totalUsers,
            long                 totalStudents,
            long                 totalManagers,
            long                 totalHostels,
            long                 activeHostels,
            long                 totalRooms,
            long                 totalBeds,
            long                 occupiedBeds,
            long                 availableBeds,
            double               overallOccupancyPct,
            long                 pendingBookings,
            long                 openComplaints,
            long                 totalWaitlisted,
            List<HostelOccupancyDto> hostelOccupancy,
            BookingFunnelDto     bookingFunnel,
            ComplaintSummaryDto  complaintSummary,
            List<WaitlistDepthDto> waitlistDepth,
            List<RoomTypeBreakdownDto> roomTypeBreakdown,
            RevenueSummaryDto revenueSummary
    ) implements DashboardDto {}

    // =========================================================================
    // MANAGER dashboard
    // =========================================================================

    /**
     * Per-hostel dashboard for MANAGER users.
     *
     * <p>Scoped to only the hostels this manager is assigned to.
     * Shows the pending queue length, occupancy state, open complaints,
     * and per-hostel cards so they can drill into each property.
     *
     * @param role              always "MANAGER" (discriminator)
     * @param pendingBookings   PENDING bookings across all managed hostels
     * @param openComplaints    OPEN complaints across all managed hostels
     * @param totalWaitlisted   waitlist entries across all managed hostels
     * @param hostels           per-hostel detail cards
     */
    record ManagerDashboard(
            String                    role,
            long                      pendingBookings,
            long                      openComplaints,
            long                      totalWaitlisted,
            List<ManagerHostelCard>   hostels
    ) implements DashboardDto {}

    /**
     * Per-hostel summary card shown in the manager dashboard.
     *
     * @param hostelId         hostel UUID
     * @param hostelName       display name
     * @param totalRooms       number of rooms in this hostel
     * @param totalBeds        sum of bed capacity
     * @param occupiedBeds     CHECKED_IN occupants right now
     * @param occupancyPct     occupiedBeds / totalBeds × 100
     * @param pendingBookings  PENDING bookings for this hostel
     * @param openComplaints   OPEN complaints for this hostel
     * @param waitlistCount    students on the waitlist for this hostel
     */
    record ManagerHostelCard(
            String hostelId,
            String hostelName,
            long   totalRooms,
            long   totalBeds,
            long   occupiedBeds,
            double occupancyPct,
            long   pendingBookings,
            long   openComplaints,
            long   waitlistCount
    ) {}

    // =========================================================================
    // STUDENT dashboard
    // =========================================================================

    /**
     * Personal dashboard for STUDENT users.
     *
     * <p>Shows the student's current accommodation (if any), their recent
     * booking activity, and any waitlist positions they hold.
     *
     * @param role              always "STUDENT" (discriminator)
     * @param totalBookings     all-time booking count
     * @param activeBookings    PENDING + APPROVED bookings right now
     * @param checkedIn         bookings with CHECKED_IN status (current residency)
     * @param waitlistCount     number of waitlist queues the student is in
     * @param currentHostel     non-null when the student is currently CHECKED_IN
     * @param recentBookings    up to 5 most recent booking summaries
     * @param waitlistEntries   current waitlist positions
     */
    record StudentDashboard(
            String                     role,
            long                       totalBookings,
            long                       activeBookings,
            long                       checkedIn,
            long                       waitlistCount,
            StudentCurrentHostel       currentHostel,
            List<StudentBookingSummary> recentBookings,
            List<StudentWaitlistEntry>  waitlistEntries
    ) implements DashboardDto {}

    /**
     * Compact current-accommodation card for the student dashboard.
     *
     * @param hostelName    name of the hostel
     * @param hostelAddress address of the hostel
     * @param roomNumber    the student's assigned room number
     * @param roomType      room type (SINGLE, DOUBLE, etc.)
     * @param checkedInAt   ISO-8601 check-in timestamp
     */
    record StudentCurrentHostel(
            String hostelName,
            String hostelAddress,
            String roomNumber,
            String roomType,
            String checkedInAt
    ) {}

    /**
     * Compact booking summary for the student dashboard recent-activity list.
     *
     * @param bookingId    UUID
     * @param hostelName   hostel display name
     * @param roomNumber   room number
     * @param status       current booking status
     * @param academicYear academic year, e.g. "2025/2026"
     * @param semester     FIRST | SECOND | FULL
     * @param requestedAt  ISO-8601 request timestamp
     */
    record StudentBookingSummary(
            String bookingId,
            String hostelName,
            String roomNumber,
            String status,
            String academicYear,
            String semester,
            String requestedAt
    ) {}

    /**
     * Compact waitlist position for the student dashboard.
     *
     * @param waitlistId   waitlist entry UUID
     * @param hostelId     UUID of the hostel being waited for
     * @param hostelName   hostel display name
     * @param roomType     the room type the student is queued for
     * @param position     1-based queue position
     * @param academicYear period being waited for
     * @param semester     semester being waited for
     */
    record StudentWaitlistEntry(
            String waitlistId,
            String hostelId,
            String hostelName,
            String roomType,
            int    position,
            String academicYear,
            String semester
    ) {}
}