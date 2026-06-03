package com.leroy.hostelbackend.module.booking.repository;

import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.booking.model.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Booking} entities.
 *
 * <p><strong>No more single-booking-per-semester guard:</strong> The
 * {@code hasActiveBooking} method has been removed. Multiple active bookings
 * per student are now permitted by design. The only remaining guard at the
 * database level is a partial unique index that prevents a student from booking
 * the <em>same room</em> twice in the same academic period while that booking
 * is still active.
 *
 * <p><strong>N+1 prevention:</strong> All queries that need associations
 * use {@code JOIN FETCH} to load them in a single SQL statement.
 */
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    // -------------------------------------------------------------------------
    // Single booking fetch (full detail)
    // -------------------------------------------------------------------------

    /**
     * Loads a booking with all associations needed for the DTO — student, room,
     * hostel, and approvedBy — in a single JOIN FETCH query.
     * Used before every state transition.
     */
    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.student
            JOIN FETCH b.room r
            JOIN FETCH r.hostel
            LEFT JOIN FETCH b.approvedBy
            WHERE b.id = :id
            """)
    Optional<Booking> findByIdWithDetails(@Param("id") UUID id);

    // -------------------------------------------------------------------------
    // Student reads
    // -------------------------------------------------------------------------

    /**
     * All bookings for a student, newest first. No status filter — returns the
     * complete history including CANCELLED, REJECTED, and EXPIRED entries.
     */
    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.room r
            JOIN FETCH r.hostel
            WHERE b.student.id = :studentId
            ORDER BY b.createdAt DESC
            """)
    Page<Booking> findByStudentId(@Param("studentId") UUID studentId, Pageable pageable);

    /**
     * A student's currently active bookings — PENDING or APPROVED.
     * Used to build the "your active bookings" reminder notification when a student
     * checks in, so they know which other bookings they should cancel.
     */
    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.room r
            JOIN FETCH r.hostel
            WHERE b.student.id = :studentId
              AND b.status IN ('PENDING', 'APPROVED')
            ORDER BY b.createdAt DESC
            """)
    List<Booking> findActiveByStudentId(@Param("studentId") UUID studentId);

    // -------------------------------------------------------------------------
    // Duplicate room booking guard
    // -------------------------------------------------------------------------

    /**
     * Checks whether a student already has an active booking for the <em>same room</em>
     * in the same academic period. A student cannot book the same room twice.
     *
     * <p>This replaces the old per-semester uniqueness check. Students may now book
     * multiple different rooms in the same semester, but not the same room twice.
     *
     * @param studentId    the student
     * @param roomId       the specific room
     * @param academicYear e.g. "2024/2025"
     * @param semester     FIRST | SECOND | FULL
     */
    @Query("""
            SELECT COUNT(b) > 0 FROM Booking b
            WHERE b.student.id = :studentId
              AND b.room.id    = :roomId
              AND b.academicYear = :academicYear
              AND b.semester     = :semester
              AND b.status IN ('PENDING', 'APPROVED', 'CHECKED_IN')
            """)
    boolean hasActiveBookingForRoom(
            @Param("studentId")    UUID   studentId,
            @Param("roomId")       UUID   roomId,
            @Param("academicYear") String academicYear,
            @Param("semester")     String semester
    );

    // -------------------------------------------------------------------------
    // Manager reads
    // -------------------------------------------------------------------------

    /**
     * PENDING bookings for hostels managed by a specific manager, oldest first.
     * Drives the manager's approval queue — oldest requests surface first (FIFO).
     */
    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.student
            JOIN FETCH b.room r
            JOIN FETCH r.hostel h
            WHERE h.manager.id = :managerId
              AND b.status = 'PENDING'
            ORDER BY b.requestedAt ASC
            """)
    Page<Booking> findPendingByManagerId(@Param("managerId") UUID managerId, Pageable pageable);

    /**
     * All bookings for a specific hostel with an optional status filter.
     * Used on the manager's hostel booking dashboard.
     */
    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.student
            JOIN FETCH b.room r
            JOIN FETCH r.hostel h
            WHERE h.id = :hostelId
              AND (:status IS NULL OR b.status = :status)
            ORDER BY b.requestedAt DESC
            """)
    Page<Booking> findByHostelId(
            @Param("hostelId") UUID   hostelId,
            @Param("status")   String status,
            Pageable pageable
    );

    // -------------------------------------------------------------------------
    // Expired booking sweeper
    // -------------------------------------------------------------------------

    /**
     * Finds all APPROVED bookings whose payment grace period has elapsed
     * and whose payment reference has not been submitted.
     *
     * <p>Called by {@code BookingExpiredSweeper} on a schedule. The sweeper will
     * auto-cancel these bookings, free the bed, and notify the waitlist.
     *
     * @param now the current timestamp — bookings with {@code paymentExpiresAt < now}
     *            and no {@code paymentRef} are returned
     */
    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.room r
            JOIN FETCH r.hostel
            JOIN FETCH b.student
            WHERE b.status = 'APPROVED'
              AND b.paymentExpiresAt IS NOT NULL
              AND b.paymentExpiresAt < :now
              AND (b.paymentRef IS NULL OR b.paymentRef = '')
            """)
    List<Booking> findExpiredUnpaidBookings(@Param("now") LocalDateTime now);

    // -------------------------------------------------------------------------
    // Occupancy and analytics helpers
    // -------------------------------------------------------------------------

    /**
     * All active (APPROVED / CHECKED_IN) bookings for a room.
     * Used for occupancy count verification and roommate matching.
     */
    @Query("""
            SELECT b FROM Booking b
            WHERE b.room.id = :roomId
              AND b.status IN ('APPROVED', 'CHECKED_IN')
            """)
    List<Booking> findActiveByRoomId(@Param("roomId") UUID roomId);

    /**
     * Active bookings for a set of compatible students in a given hostel.
     * Used by the roommate matching algorithm in {@code PreferenceService}.
     */
    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.student
            JOIN FETCH b.room r
            JOIN FETCH r.hostel h
            WHERE h.id = :hostelId
              AND b.student.id IN :studentIds
              AND b.status IN ('APPROVED', 'CHECKED_IN')
            """)
    List<Booking> findActiveByRoomIdIn(
            @Param("hostelId")   UUID       hostelId,
            @Param("studentIds") List<UUID> studentIds
    );

    /**
     * Used by {@code BookingService.isCurrentResident} to gate complaint creation.
     * A student can only raise a room-specific complaint if they are CHECKED_IN.
     */
    boolean existsByStudentIdAndStatusAndRoom_Hostel_Id(
            UUID studentId, BookingStatus status, UUID hostelId);


    @Query("SELECT b FROM Booking b WHERE b.status = 'CHECKED_IN' AND b.student.id = :userId")
    List<Booking> findCurrentByUserId(@Param("userId") UUID userId);
}