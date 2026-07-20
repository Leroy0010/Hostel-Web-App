package com.leroy.hostelbackend.module.analytics.service;

import com.leroy.hostelbackend.module.analytics.dto.*;
import com.leroy.hostelbackend.module.complaint.model.ComplaintCategory;
import com.leroy.hostelbackend.module.room.model.RoomType;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Admin analytics service.
 *
 * <p><strong>Implementation choice — native SQL via JdbcTemplate:</strong>
 * These queries aggregate data across multiple tables with GROUP BY, COALESCE,
 * and conditional counts. Writing them as JPQL would require multiple round trips
 * or result-set mappings far more verbose than plain SQL. JdbcTemplate with
 * {@code queryForObject} / {@code query} is the right tool here.
 *
 * <p>All methods are {@code @Transactional(readOnly = true)} — they never mutate
 * data, and the read-only hint lets PostgreSQL skip shared lock overhead.
 *
 * <p><strong>Performance:</strong> Every query here is backed by the indexes
 * defined in {@code indexes.sql}. The most expensive call is
 * {@link #getHostelOccupancyBreakdown} which scans hostels, rooms, and bookings —
 * all indexed on FK and status columns.
 */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final JdbcTemplate jdbc;

    // -------------------------------------------------------------------------
    // System overview
    // -------------------------------------------------------------------------

    /**
     * Builds the top-level admin dashboard overview card.
     * A single compound read — all numbers in one method call.
     */
    @Transactional(readOnly = true)
    public SystemOverviewDto getSystemOverview() {

        long totalHostels   = count("SELECT COUNT(*) FROM hostels");
        long activeHostels  = count("SELECT COUNT(*) FROM hostels WHERE is_active = true");
        long totalRooms     = count("""
                SELECT COUNT(*) FROM rooms r
                JOIN hostels h ON h.id = r.hostel_id
                WHERE h.is_active = true
                """);

        long totalBeds      = coalesce("""
                SELECT COALESCE(SUM(r.capacity), 0) FROM rooms r
                JOIN hostels h ON h.id = r.hostel_id
                WHERE h.is_active = true
                """);

        long occupiedBeds   = coalesce("""
                SELECT COALESCE(SUM(r.current_occupancy), 0) FROM rooms r
                JOIN hostels h ON h.id = r.hostel_id
                WHERE h.is_active = true
                  AND r.status != 'UNDER_MAINTENANCE'
                """);

        long availableBeds  = totalBeds - occupiedBeds;
        double occPct       = totalBeds == 0 ? 0.0
                : round2dp((double) occupiedBeds / totalBeds * 100);

        long totalStudents  = count("SELECT COUNT(*) FROM users WHERE role = 'STUDENT' AND is_active = true");
        long pendingBookings = count("SELECT COUNT(*) FROM bookings WHERE status = 'PENDING'");
        long openComplaints  = count("SELECT COUNT(*) FROM complaints WHERE status = 'OPEN'");
        long totalWaitlisted = count("SELECT COUNT(*) FROM waitlists");

        return new SystemOverviewDto(
                totalHostels, activeHostels, totalRooms,
                totalBeds, occupiedBeds, availableBeds, occPct,
                totalStudents, pendingBookings, openComplaints, totalWaitlisted
        );
    }

    // -------------------------------------------------------------------------
    // Hostel occupancy breakdown
    // -------------------------------------------------------------------------

    /**
     * Per-hostel occupancy rates — the main analytics table.
     *
     * <p>Returns all active hostels sorted by occupancy rate descending
     * (busiest first) so the admin can spot bottlenecks immediately.
     */
    @Transactional(readOnly = true)
    public List<HostelOccupancyDto> getHostelOccupancyBreakdown() {
        String sql = """
                SELECT
                    h.id::text                                             AS hostel_id,
                    h.name                                                 AS hostel_name,
                    COUNT(DISTINCT r.id)                                   AS total_rooms,
                    COALESCE(SUM(r.capacity), 0)                           AS total_beds,
                    COALESCE(SUM(r.current_occupancy), 0)                  AS occupied_beds,
                    CASE WHEN COALESCE(SUM(r.capacity), 0) = 0 THEN 0.0
                         ELSE ROUND(
                             COALESCE(SUM(r.current_occupancy), 0)::numeric
                             / COALESCE(SUM(r.capacity), 1)::numeric * 100, 1
                         )
                    END                                                    AS occupancy_pct,
                    (SELECT COUNT(*) FROM waitlists w WHERE w.hostel_id = h.id)
                                                                           AS waitlist_count,
                    (SELECT COUNT(*) FROM bookings b
                     JOIN rooms rb ON rb.id = b.room_id
                     WHERE rb.hostel_id = h.id AND b.status = 'PENDING')   AS pending_bookings
                FROM hostels h
                LEFT JOIN rooms r ON r.hostel_id = h.id
                WHERE h.is_active = true
                GROUP BY h.id, h.name
                ORDER BY occupancy_pct DESC, h.name
                """;

        return jdbc.query(sql, (rs, _) -> new HostelOccupancyDto(
                rs.getString("hostel_id"),
                rs.getString("hostel_name"),
                rs.getLong("total_rooms"),
                rs.getLong("total_beds"),
                rs.getLong("occupied_beds"),
                rs.getDouble("occupancy_pct"),
                rs.getLong("waitlist_count"),
                rs.getLong("pending_bookings")
        ));
    }

    // -------------------------------------------------------------------------
    // Booking funnel
    // -------------------------------------------------------------------------

    /**
     * Counts bookings in each status — the conversion funnel.
     * Helps managers see if approvals are bottlenecked or rejection rates are high.
     */
    @Transactional(readOnly = true)
    public BookingFunnelDto getBookingFunnel() {
        String sql = """
                SELECT
                    COUNT(*) FILTER (WHERE status = 'PENDING')     AS pending,
                    COUNT(*) FILTER (WHERE status = 'APPROVED')    AS approved,
                    COUNT(*) FILTER (WHERE status = 'REJECTED')    AS rejected,
                    COUNT(*) FILTER (WHERE status = 'CHECKED_IN')  AS checked_in,
                    COUNT(*) FILTER (WHERE status = 'CHECKED_OUT') AS checked_out,
                    COUNT(*) FILTER (WHERE status = 'CANCELLED')   AS cancelled,
                    COUNT(*)                                        AS total
                FROM bookings
                """;

        return jdbc.queryForObject(sql, (rs, _) -> new BookingFunnelDto(
                rs.getLong("pending"),
                rs.getLong("approved"),
                rs.getLong("rejected"),
                rs.getLong("checked_in"),
                rs.getLong("checked_out"),
                rs.getLong("cancelled"),
                rs.getLong("total")
        ));
    }

    // -------------------------------------------------------------------------
    // Revenue summary
    // -------------------------------------------------------------------------

    /**
     * Summarises declared payment amounts (informational — no real gateway).
     *
     * @param academicYear  filter for the current period, e.g. "2024/2025"
     * @param semester      "FIRST", "SECOND", or "FULL"
     */
    @Transactional(readOnly = true)
    public RevenueSummaryDto getRevenueSummary(String academicYear, String semester) {
        String totalSql = """
                SELECT COALESCE(SUM(amount_paid), 0)
                FROM bookings
                WHERE amount_paid IS NOT NULL
                """;

        String periodSql = """
                SELECT COALESCE(SUM(amount_paid), 0)
                FROM bookings
                WHERE amount_paid IS NOT NULL
                  AND academic_year = ?
                  AND semester = ?
                """;

        String paidCountSql = """
                SELECT COUNT(*) FROM bookings
                WHERE payment_ref IS NOT NULL AND payment_ref != ''
                """;

        String unpaidApprovedSql = """
                SELECT COUNT(*) FROM bookings
                WHERE status = 'APPROVED'
                  AND (payment_ref IS NULL OR payment_ref = '')
                """;

        BigDecimal total          = jdbc.queryForObject(totalSql, BigDecimal.class);
        BigDecimal period         = jdbc.queryForObject(periodSql, BigDecimal.class, academicYear, semester);
        long       paidCount      = jdbc.queryForObject(paidCountSql, Long.class);
        long       unpaidApproved = jdbc.queryForObject(unpaidApprovedSql, Long.class);

        return new RevenueSummaryDto(
                total   != null ? total  : BigDecimal.ZERO,
                period  != null ? period : BigDecimal.ZERO,
                paidCount,
                unpaidApproved
        );
    }

    // -------------------------------------------------------------------------
    // Complaint summary
    // -------------------------------------------------------------------------

    /**
     * Complaint counts by status and category — helps managers prioritise.
     */
    @Transactional(readOnly = true)
    public ComplaintSummaryDto getComplaintSummary() {
        long open       = count("SELECT COUNT(*) FROM complaints WHERE status = 'OPEN'");
        long inProgress = count("SELECT COUNT(*) FROM complaints WHERE status = 'IN_PROGRESS'");
        long resolved   = count("SELECT COUNT(*) FROM complaints WHERE status = 'RESOLVED'");
        long closed     = count("SELECT COUNT(*) FROM complaints WHERE status = 'CLOSED'");

        String categorySql = """
        SELECT
            category,
            COUNT(*)                                           AS total,
            COUNT(*) FILTER (WHERE status = 'OPEN')           AS open_count
        FROM complaints
        GROUP BY category
        ORDER BY total DESC
        """;

        List<ComplaintSummaryDto.CategoryBreakdownDto> breakdown = jdbc.query(
                categorySql,
                (rs, _) -> {
                    // 1. Extract as String
                    String categoryStr = rs.getString("category");

                    // 2. Convert to Enum (handling potential nulls from the database)
                    ComplaintCategory category = categoryStr != null
                            ? ComplaintCategory.valueOf(categoryStr)
                            : null;

                    // 3. Return the DTO
                    return new ComplaintSummaryDto.CategoryBreakdownDto(
                            category,
                            rs.getLong("total"),
                            rs.getLong("open_count")
                    );
                }
        );

        return new ComplaintSummaryDto(open, inProgress, resolved, closed, breakdown);
    }

    // -------------------------------------------------------------------------
    // Waitlist depth
    // -------------------------------------------------------------------------

    /**
     * Waitlist queue depth per hostel — sorted by queue size descending.
     * High queue depth signals demand for new rooms or capacity expansion.
     */
    @Transactional(readOnly = true)
    public List<WaitlistDepthDto> getWaitlistDepth() {
        String sql = """
                SELECT
                    h.id::text  AS hostel_id,
                    h.name      AS hostel_name,
                    COUNT(w.id) AS queue_depth
                FROM hostels h
                LEFT JOIN waitlists w ON w.hostel_id = h.id
                WHERE h.is_active = true
                GROUP BY h.id, h.name
                ORDER BY queue_depth DESC, h.name
                """;

        return jdbc.query(sql, (rs, _) -> new WaitlistDepthDto(
                rs.getString("hostel_id"),
                rs.getString("hostel_name"),
                rs.getLong("queue_depth")
        ));
    }

    // -------------------------------------------------------------------------
    // Room type breakdown
    // -------------------------------------------------------------------------

    /**
     * Room type distribution across the system — helps with supply/demand analysis.
     */
    @Transactional(readOnly = true)
    public List<RoomTypeBreakdownDto> getRoomTypeBreakdown() {
        String sql = """
                SELECT
                    r.room_type,
                    COUNT(r.id)                                           AS room_count,
                    COALESCE(SUM(r.capacity), 0)                          AS bed_count,
                    COALESCE(SUM(r.current_occupancy), 0)                 AS occupied_beds
                FROM rooms r
                JOIN hostels h ON h.id = r.hostel_id
                WHERE h.is_active = true
                GROUP BY r.room_type
                ORDER BY bed_count DESC
                """;

        return jdbc.query(sql, (rs, _) -> {
            String roomTypeStr = rs.getString("room_type");
            RoomType roomType = roomTypeStr != null ? RoomType.valueOf(roomTypeStr) : null;

            return new RoomTypeBreakdownDto(
                    roomType,
                    rs.getLong("room_count"),
                    rs.getLong("bed_count"),
                    rs.getLong("occupied_beds")
            );
        });
    }


    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /** Runs a COUNT query and returns the result as a long. */
    private long count(String sql) {
        Long result = jdbc.queryForObject(sql, Long.class);
        return result != null ? result : 0L;
    }

    /** Runs a SUM/COALESCE query and returns the result as a long. */
    private long coalesce(String sql) {
        Long result = jdbc.queryForObject(sql, Long.class);
        return result != null ? result : 0L;
    }

    private double round2dp(double value) {
        return BigDecimal.valueOf(value)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
    }
}