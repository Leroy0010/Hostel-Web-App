package com.leroy.hostelbackend.module.dashboard.service;

import com.leroy.hostelbackend.module.analytics.service.AnalyticsService;
import com.leroy.hostelbackend.module.dashboard.dto.DashboardDto;
import com.leroy.hostelbackend.module.user.model.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

/**
 * Assembles a role-specific dashboard payload for the authenticated user.
 *
 * <p><strong>Design principle:</strong> One endpoint, three shapes.
 * The service dispatches to a private builder method based on {@link UserRole}
 * and returns the appropriate sealed-interface implementation. The controller
 * serialises it with a {@code "role"} discriminator so the TypeScript frontend
 * can narrow the union type at runtime.
 *
 * <p><strong>Data sources:</strong> All SQL goes through JdbcTemplate for the
 * same reason as {@link AnalyticsService} — aggregation queries across multiple
 * tables are far cleaner as plain SQL than as JPQL with multiple result-set
 * mappings. We reuse {@link AnalyticsService} for the admin path since those
 * queries are already tested and indexed.
 *
 * <p><strong>Performance:</strong> Every query here is backed by the indexes
 * defined in {@code indexes.sql}. The manager and student paths are scoped to
 * small subsets (one manager's hostels, one student's bookings), so they are
 * fast even without caching.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final JdbcTemplate      jdbc;
    private final AnalyticsService  analyticsService;

    // =========================================================================
    // Public dispatch
    // =========================================================================

    /**
     * Returns the role-specific dashboard for the authenticated user.
     *
     * @param userId the authenticated user's UUID
     * @param role   the authenticated user's role
     * @return a sealed {@link DashboardDto} variant matching the role
     */
    @Transactional(readOnly = true)
    public DashboardDto getDashboard(UUID userId, UserRole role) {
        return switch (role) {
            case ADMIN   -> buildAdminDashboard();
            case MANAGER -> buildManagerDashboard(userId);
            case STUDENT -> buildStudentDashboard(userId);
        };
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    /**
     * Assembles the full system-wide admin dashboard.
     *
     * <p>Delegates to {@link AnalyticsService} for the hostel occupancy,
     * booking funnel, complaint summary, and waitlist depth — these queries
     * are already tested there. Adds user-count metrics which are purely
     * admin concerns.
     */
    private DashboardDto.AdminDashboard buildAdminDashboard() {
        // ── User counts (admin-only metrics) ─────────────────────────────────
        long totalUsers    = count("SELECT COUNT(*) FROM users WHERE is_active = true");
        long totalStudents = count("SELECT COUNT(*) FROM users WHERE role = 'STUDENT' AND is_active = true");
        long totalManagers = count("SELECT COUNT(*) FROM users WHERE role = 'MANAGER' AND is_active = true");

        // ── Hostel and bed counts ─────────────────────────────────────────────
        long totalHostels  = count("SELECT COUNT(*) FROM hostels");
        long activeHostels = count("SELECT COUNT(*) FROM hostels WHERE is_active = true");

        long totalRooms = count("""
                SELECT COUNT(*) FROM rooms r
                JOIN hostels h ON h.id = r.hostel_id
                WHERE h.is_active = true
                """);

        long totalBeds = coalesce("""
                SELECT COALESCE(SUM(r.capacity), 0) FROM rooms r
                JOIN hostels h ON h.id = r.hostel_id
                WHERE h.is_active = true
                """);

        long occupiedBeds = coalesce("""
                SELECT COALESCE(SUM(r.current_occupancy), 0) FROM rooms r
                JOIN hostels h ON h.id = r.hostel_id
                WHERE h.is_active = true
                """);

        long availableBeds     = totalBeds - occupiedBeds;
        double occupancyPct    = totalBeds == 0 ? 0.0
                : round1dp((double) occupiedBeds / totalBeds * 100);

        // ── Operational counters ──────────────────────────────────────────────
        long pendingBookings = count("SELECT COUNT(*) FROM bookings WHERE status = 'PENDING'");
        long openComplaints  = count("SELECT COUNT(*) FROM complaints WHERE status = 'OPEN'");
        long totalWaitlisted = count("SELECT COUNT(*) FROM waitlists");

        // ── Delegate to AnalyticsService for complex aggregations ─────────────
        var hostelOccupancy    = analyticsService.getHostelOccupancyBreakdown();
        var bookingFunnel      = analyticsService.getBookingFunnel();
        var complaintSummary   = analyticsService.getComplaintSummary();
        var waitlistDepth      = analyticsService.getWaitlistDepth();
        var roomTypeBreakdown  = analyticsService.getRoomTypeBreakdown();

        // ── Revenue summary for the most recently active academic period ──────
        // The revenue endpoint needs an (academicYear, semester) pair; rather
        // than defaulting to a hardcoded placeholder period, we derive "current"
        // from the most recent booking request so the dashboard card always
        // reflects real, live data instead of a stale fixed period.
        String[] currentPeriod = resolveCurrentPeriod();
        var revenueSummary = analyticsService.getRevenueSummary(currentPeriod[0], currentPeriod[1]);

        log.debug("[DASHBOARD] Admin dashboard assembled");

        return new DashboardDto.AdminDashboard(
                "ADMIN",
                totalUsers, totalStudents, totalManagers,
                totalHostels, activeHostels,
                totalRooms, totalBeds, occupiedBeds, availableBeds, occupancyPct,
                pendingBookings, openComplaints, totalWaitlisted,
                hostelOccupancy, bookingFunnel, complaintSummary, waitlistDepth,
                roomTypeBreakdown, revenueSummary
        );
    }

    /**
     * Resolves the (academicYear, semester) pair of the most recently
     * requested booking, used as the "current period" for the admin revenue
     * card. Falls back to a sensible placeholder when no bookings exist yet.
     */
    private String[] resolveCurrentPeriod() {
        List<String[]> rows = jdbc.query("""
                SELECT academic_year, semester
                FROM bookings
                ORDER BY requested_at DESC
                LIMIT 1
                """,
                (rs, _) -> new String[]{ rs.getString("academic_year"), rs.getString("semester") });

        if (rows.isEmpty()) {
            return new String[]{ "2024/2025", "FIRST" };
        }
        return rows.getFirst();
    }

    // =========================================================================
    // MANAGER
    // =========================================================================

    /**
     * Assembles the manager's scoped dashboard — only their assigned hostels.
     *
     * <p>All queries are parameterised on {@code managerId} so they are
     * naturally scoped to the manager's hostels without any post-filter.
     */
    private DashboardDto.ManagerDashboard buildManagerDashboard(UUID managerId) {
        String managerIdStr = managerId.toString();

        // ── Cross-hostel summary counters ─────────────────────────────────────
        long pendingBookings = jdbc.queryForObject("""
                SELECT COUNT(b.id)
                FROM bookings b
                JOIN rooms r ON r.id = b.room_id
                JOIN hostels h ON h.id = r.hostel_id
                WHERE h.manager_id = ?::uuid
                  AND b.status = 'PENDING'
                """, Long.class, managerIdStr);

        long openComplaints = jdbc.queryForObject("""
                SELECT COUNT(c.id)
                FROM complaints c
                JOIN hostels h ON h.id = c.hostel_id
                WHERE h.manager_id = ?::uuid
                  AND c.status = 'OPEN'
                """, Long.class, managerIdStr);

        long totalWaitlisted = jdbc.queryForObject("""
                SELECT COUNT(w.id)
                FROM waitlists w
                JOIN hostels h ON h.id = w.hostel_id
                WHERE h.manager_id = ?::uuid
                """, Long.class, managerIdStr);

        // ── Per-hostel cards ──────────────────────────────────────────────────
        String hostelCardSql = """
                SELECT
                    h.id::text                                                        AS hostel_id,
                    h.name                                                            AS hostel_name,
                    COUNT(DISTINCT r.id)                                              AS total_rooms,
                    COALESCE(SUM(r.capacity), 0)                                      AS total_beds,
                    COALESCE(SUM(r.current_occupancy), 0)                             AS occupied_beds,
                    CASE WHEN COALESCE(SUM(r.capacity), 0) = 0 THEN 0.0
                         ELSE ROUND(
                             COALESCE(SUM(r.current_occupancy), 0)::numeric
                             / COALESCE(SUM(r.capacity), 1)::numeric * 100, 1)
                    END                                                               AS occupancy_pct,
                    (SELECT COUNT(*) FROM bookings b2
                     JOIN rooms r2 ON r2.id = b2.room_id
                     WHERE r2.hostel_id = h.id AND b2.status = 'PENDING')             AS pending_bookings,
                    (SELECT COUNT(*) FROM complaints c2
                     WHERE c2.hostel_id = h.id AND c2.status = 'OPEN')                AS open_complaints,
                    (SELECT COUNT(*) FROM waitlists w2 WHERE w2.hostel_id = h.id)     AS waitlist_count
                FROM hostels h
                LEFT JOIN rooms r ON r.hostel_id = h.id
                WHERE h.manager_id = ?::uuid
                  AND h.is_active = true
                GROUP BY h.id, h.name
                ORDER BY occupancy_pct DESC, h.name
                """;

        List<DashboardDto.ManagerHostelCard> hostelCards = jdbc.query(
                hostelCardSql,
                (rs, _) -> new DashboardDto.ManagerHostelCard(
                        rs.getString("hostel_id"),
                        rs.getString("hostel_name"),
                        rs.getLong("total_rooms"),
                        rs.getLong("total_beds"),
                        rs.getLong("occupied_beds"),
                        rs.getDouble("occupancy_pct"),
                        rs.getLong("pending_bookings"),
                        rs.getLong("open_complaints"),
                        rs.getLong("waitlist_count")
                ),
                managerIdStr
        );

        log.debug("[DASHBOARD] Manager dashboard assembled: managerId={}, hostels={}",
                managerId, hostelCards.size());

        return new DashboardDto.ManagerDashboard(
                "MANAGER",
                pendingBookings,
                openComplaints,
                totalWaitlisted,
                hostelCards
        );
    }

    // =========================================================================
    // STUDENT
    // =========================================================================

    /**
     * Assembles the student's personal dashboard.
     *
     * <p>Surfaces:
     * <ul>
     *   <li>Booking counts (total, active, checked-in).</li>
     *   <li>Current accommodation card (if CHECKED_IN).</li>
     *   <li>Up to 5 most recent bookings for the activity feed.</li>
     *   <li>All current waitlist positions.</li>
     * </ul>
     */
    private DashboardDto.StudentDashboard buildStudentDashboard(UUID studentId) {
        String studentIdStr = studentId.toString();

        // ── Booking counts ────────────────────────────────────────────────────
        long totalBookings = jdbc.queryForObject(
                "SELECT COUNT(*) FROM bookings WHERE student_id = ?::uuid",
                Long.class, studentIdStr);

        long activeBookings = jdbc.queryForObject("""
                SELECT COUNT(*) FROM bookings
                WHERE student_id = ?::uuid
                  AND status IN ('PENDING', 'APPROVED')
                """, Long.class, studentIdStr);

        long checkedIn = jdbc.queryForObject("""
                SELECT COUNT(*) FROM bookings
                WHERE student_id = ?::uuid
                  AND status = 'CHECKED_IN'
                """, Long.class, studentIdStr);

        long waitlistCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM waitlists WHERE student_id = ?::uuid",
                Long.class, studentIdStr);

        // ── Current accommodation ─────────────────────────────────────────────
        DashboardDto.StudentCurrentHostel currentHostel = null;

        List<DashboardDto.StudentCurrentHostel> checkedInRows = jdbc.query("""
                SELECT h.name, h.address, r.room_number, r.room_type,
                       TO_CHAR(b.checked_in_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS checked_in_at
                FROM bookings b
                JOIN rooms r ON r.id = b.room_id
                JOIN hostels h ON h.id = r.hostel_id
                WHERE b.student_id = ?::uuid
                  AND b.status = 'CHECKED_IN'
                ORDER BY b.checked_in_at DESC
                LIMIT 1
                """,
                (rs, _) -> new DashboardDto.StudentCurrentHostel(
                        rs.getString("name"),
                        rs.getString("address"),
                        rs.getString("room_number"),
                        rs.getString("room_type"),
                        rs.getString("checked_in_at")
                ),
                studentIdStr);

        if (!checkedInRows.isEmpty()) {
            currentHostel = checkedInRows.getFirst();
        }

        // ── Recent bookings (up to 5) ─────────────────────────────────────────
        List<DashboardDto.StudentBookingSummary> recentBookings = jdbc.query("""
                SELECT b.id::text, h.name AS hostel_name, r.room_number,
                       b.status, b.academic_year, b.semester,
                       TO_CHAR(b.requested_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS requested_at
                FROM bookings b
                JOIN rooms r ON r.id = b.room_id
                JOIN hostels h ON h.id = r.hostel_id
                WHERE b.student_id = ?::uuid
                ORDER BY b.requested_at DESC
                LIMIT 5
                """,
                (rs, _) -> new DashboardDto.StudentBookingSummary(
                        rs.getString("id"),
                        rs.getString("hostel_name"),
                        rs.getString("room_number"),
                        rs.getString("status"),
                        rs.getString("academic_year"),
                        rs.getString("semester"),
                        rs.getString("requested_at")
                ),
                studentIdStr);

        // ── Waitlist entries ──────────────────────────────────────────────────
        List<DashboardDto.StudentWaitlistEntry> waitlistEntries = jdbc.query("""
                SELECT w.id::text, h.id::text AS hostel_id, h.name AS hostel_name,
                       w.room_type, w.position, w.academic_year, w.semester
                FROM waitlists w
                JOIN hostels h ON h.id = w.hostel_id
                WHERE w.student_id = ?::uuid
                ORDER BY w.position ASC
                """,
                (rs, _) -> new DashboardDto.StudentWaitlistEntry(
                        rs.getString("id"),
                        rs.getString("hostel_id"),
                        rs.getString("hostel_name"),
                        rs.getString("room_type"),
                        rs.getInt("position"),
                        rs.getString("academic_year"),
                        rs.getString("semester")
                ),
                studentIdStr);

        log.debug("[DASHBOARD] Student dashboard assembled: studentId={}", studentId);

        return new DashboardDto.StudentDashboard(
                "STUDENT",
                totalBookings,
                activeBookings,
                checkedIn,
                waitlistCount,
                currentHostel,
                recentBookings,
                waitlistEntries
        );
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    private long count(String sql) {
        Long result = jdbc.queryForObject(sql, Long.class);
        return result != null ? result : 0L;
    }

    private long coalesce(String sql) {
        Long result = jdbc.queryForObject(sql, Long.class);
        return result != null ? result : 0L;
    }

    private double round1dp(double value) {
        return BigDecimal.valueOf(value)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
    }
}