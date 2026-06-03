package com.leroy.hostelbackend.module.analytics.controller;

import com.leroy.hostelbackend.module.analytics.dto.*;
import com.leroy.hostelbackend.module.analytics.service.AnalyticsService;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin-only analytics dashboard endpoints.
 *
 * <p>All endpoints require {@code ROLE_ADMIN}. Managers can see per-hostel
 * breakdowns via their hostel-specific endpoints (in {@code BookingController}
 * and {@code ComplaintController}) — the global view here is admin only.
 *
 * <p>Endpoint summary:
 * <pre>
 * GET /admin/analytics/overview              → system-wide dashboard card
 * GET /admin/analytics/occupancy             → per-hostel occupancy table
 * GET /admin/analytics/bookings/funnel       → booking pipeline funnel
 * GET /admin/analytics/revenue               → declared payment summary
 * GET /admin/analytics/complaints            → complaint status + category breakdown
 * GET /admin/analytics/waitlists             → waitlist depth per hostel
 * GET /admin/analytics/rooms/types           → room type distribution
 * </pre>
 */
@RestController
@RequestMapping("/api/admin/analytics")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * System overview — the top-level admin landing page card.
     * Returns aggregate counts: hostels, beds, occupancy rate, pending bookings, etc.
     */
    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<SystemOverviewDto>> overview() {
        return ResponseEntity.ok(ApiResponse.success(
                "System overview fetched.", analyticsService.getSystemOverview()));
    }

    /**
     * Per-hostel occupancy breakdown sorted by occupancy rate (busiest first).
     * Includes waitlist depth and pending booking count per hostel.
     */
    @GetMapping("/occupancy")
    public ResponseEntity<ApiResponse<List<HostelOccupancyDto>>> occupancy() {
        return ResponseEntity.ok(ApiResponse.success(
                "Occupancy breakdown fetched.", analyticsService.getHostelOccupancyBreakdown()));
    }

    /**
     * Booking pipeline funnel — counts per status.
     * Useful for spotting approval bottlenecks or high rejection rates.
     */
    @GetMapping("/bookings/funnel")
    public ResponseEntity<ApiResponse<BookingFunnelDto>> bookingFunnel() {
        return ResponseEntity.ok(ApiResponse.success(
                "Booking funnel fetched.", analyticsService.getBookingFunnel()));
    }

    /**
     * Declared payment summary for a given academic period.
     * No real payment is processed — this reflects submitted payment references.
     *
     * @param academicYear e.g. "2024/2025" (defaults to placeholder if omitted)
     * @param semester     "FIRST", "SECOND", or "FULL"
     */
    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<RevenueSummaryDto>> revenue(
            @RequestParam(defaultValue = "2024/2025") String academicYear,
            @RequestParam(defaultValue = "FIRST")     String semester
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Revenue summary fetched.",
                analyticsService.getRevenueSummary(academicYear, semester)));
    }

    /**
     * Complaint analytics — open/in-progress/resolved/closed counts
     * plus a breakdown by category to surface the most common issue types.
     */
    @GetMapping("/complaints")
    public ResponseEntity<ApiResponse<ComplaintSummaryDto>> complaints() {
        return ResponseEntity.ok(ApiResponse.success(
                "Complaint summary fetched.", analyticsService.getComplaintSummary()));
    }

    /**
     * Waitlist queue depth per hostel — sorted by queue size descending.
     * High depth = strong demand signal for that hostel.
     */
    @GetMapping("/waitlists")
    public ResponseEntity<ApiResponse<List<WaitlistDepthDto>>> waitlists() {
        return ResponseEntity.ok(ApiResponse.success(
                "Waitlist depth fetched.", analyticsService.getWaitlistDepth()));
    }

    /**
     * Room type distribution — how many SINGLE, DOUBLE, TRIPLE, etc. rooms exist
     * and their current occupancy. Useful for capacity planning.
     */
    @GetMapping("/rooms/types")
    public ResponseEntity<ApiResponse<List<RoomTypeBreakdownDto>>> roomTypes() {
        return ResponseEntity.ok(ApiResponse.success(
                "Room type breakdown fetched.", analyticsService.getRoomTypeBreakdown()));
    }
}