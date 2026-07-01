package com.leroy.hostelbackend.module.booking.repository;

import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.booking.model.BookingStatus;
import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.room.model.Room;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Booking} entities.
 *
 * <p><strong>Period-scoped capacity:</strong> {@link #countReservedBeds} is the
 * authoritative source for whether a room has space for a given academic period.
 * It replaces the old {@code room.currentOccupancy} check for booking decisions.
 * {@code room.currentOccupancy} still tracks physical presence (who is actually in
 * the room right now) and is used for analytics and room status display.
 *
 * <p><strong>Auto-reject and auto-draft:</strong> {@link #rejectOtherPendingForRoom}
 * bulk-rejects stale PENDING bookings when the last bed for a period is filled.
 * The sweeper uses {@link #findExpiredUnpaidBookings} and
 * {@link #findExpiredWaitlistDrafts} to clean up automatically.
 */
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    // -------------------------------------------------------------------------
    // Single booking fetch
    // -------------------------------------------------------------------------

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

    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.room r
            JOIN FETCH r.hostel
            WHERE b.student.id = :studentId
                AND (CAST(:status AS string) IS NULL OR b.status = :status)
            ORDER BY b.createdAt DESC
            """)
    Page<Booking> findByStudentId(@Param("studentId") UUID studentId, @Param("status") BookingStatus status, Pageable pageable);

    /**
     * Active bookings for reminder notification after check-in.
     * Returns PENDING and APPROVED bookings the student may want to cancel.
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
    // Period-scoped capacity
    // -------------------------------------------------------------------------

    /**
     * Core capacity query. Returns the number of beds already spoken for in a
     * specific room+period. Used instead of {@code room.currentOccupancy} for
     * all booking availability decisions.
     *
     * <p>Counts APPROVED + CHECKED_IN bookings only.
     * PENDING does not lock a bed — approval does.
     *
     * @param roomId       the room to check
     * @param academicYear e.g. "2025/2026"
     * @param semester     FIRST | SECOND | FULL
     */
    @Query("""
            SELECT COUNT(b) FROM Booking b
            WHERE b.room.id      = :roomId
              AND b.academicYear = :academicYear
              AND b.semester     = :semester
              AND b.status IN ('APPROVED', 'CHECKED_IN')
            """)
    long countReservedBeds(
            @Param("roomId")       UUID   roomId,
            @Param("academicYear") String academicYear,
            @Param("semester")     String semester
    );

    /**
     * Duplicate room booking guard. Prevents a student from submitting two PENDING
     * or APPROVED bookings for the exact same room in the same period.
     *
     * <p>This is also enforced by the partial unique index
     * {@code idx_unique_active_room_booking} at the DB level.
     */
    @Query("""
            SELECT COUNT(b) > 0 FROM Booking b
            WHERE b.student.id   = :studentId
              AND b.room.id      = :roomId
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

    /**
     * Semester linearity check.
     * Returns {@code true} if the room already has a CHECKED_IN or CHECKED_OUT
     * booking for the FIRST semester of the given academic year.
     * Used to gate SECOND semester bookings.
     *
     * @param roomId       the room being checked
     * @param academicYear e.g. "2025/2026"
     */
    @Query("""
            SELECT COUNT(b) > 0 FROM Booking b
            WHERE b.room.id      = :roomId
              AND b.academicYear = :academicYear
              AND b.semester     = 'FIRST'
              AND b.status IN ('CHECKED_IN', 'CHECKED_OUT')
            """)
    boolean hasFirstSemesterOccupancy(
            @Param("roomId")       UUID   roomId,
            @Param("academicYear") String academicYear
    );

    /**
     * FULL semester booking gate.
     * A FULL booking covers both halves of an academic year, so we check that
     * neither FIRST nor SECOND is already occupied for that period.
     *
     * @param roomId       the room
     * @param academicYear e.g. "2025/2026"
     */
    @Query("""
            SELECT COUNT(b) > 0 FROM Booking b
            WHERE b.room.id      = :roomId
              AND b.academicYear = :academicYear
              AND b.semester     IN ('FIRST', 'SECOND', 'FULL')
              AND b.status       IN ('APPROVED', 'CHECKED_IN')
            """)
    boolean hasAnyActiveBookingForYear(
            @Param("roomId")       UUID   roomId,
            @Param("academicYear") String academicYear
    );

    /**
     * FULL semester conflict check — per student.
     *
     * <p>A FULL semester booking spans the entire academic year. Before allowing
     * it, we check that <em>this specific student</em> does not already hold an
     * active FIRST or SECOND booking for the same room in the same year. This
     * prevents a student from double-booking their own bed.
     *
     * <p><strong>Why per-student?</strong> If Student A books FIRST and Student
     * B tries to book FULL, Student B's FULL booking should simply be evaluated
     * against the period-capacity check (countReservedBeds for 'FULL'), not
     * blocked by Student A's existence. The only cross-semester conflict we
     * enforce is that a single student cannot hold overlapping bookings for the
     * same room.
     *
     * @param studentId    the student attempting the FULL booking
     * @param roomId       the room
     * @param academicYear the year
     * @return {@code true} if the student already has an active FIRST/SECOND
     *         booking for this room in this year
     */
    @Query("""
            SELECT COUNT(b) > 0 FROM Booking b
            WHERE b.student.id   = :studentId
              AND b.room.id      = :roomId
              AND b.academicYear = :academicYear
              AND b.semester     IN ('FIRST', 'SECOND')
              AND b.status       IN ('PENDING', 'APPROVED', 'CHECKED_IN')
            """)
    boolean studentHasSemesterBookingForYear(
            @Param("studentId")    UUID   studentId,
            @Param("roomId")       UUID   roomId,
            @Param("academicYear") String academicYear
    );

    /**
     * Latest completed booking for a room — used to validate academic year linearity.
     * Returns the most recent CHECKED_IN or CHECKED_OUT booking for the room,
     * so the service can verify the next booking's year is sequential.
     */
    @Query("""
            SELECT b FROM Booking b
            WHERE b.room.id  = :roomId
              AND b.status   IN ('CHECKED_IN', 'CHECKED_OUT', 'APPROVED')
            ORDER BY b.academicYear DESC, b.createdAt DESC
            LIMIT 1
            """)
    Optional<Booking> findLatestOccupancyBooking(@Param("roomId") UUID roomId);

    // -------------------------------------------------------------------------
    // Auto-reject stale PENDING bookings
    // -------------------------------------------------------------------------

    /**
     * Bulk-rejects all PENDING bookings for a room+period except the one just approved.
     * Called when the last bed for a period is filled to clean up stale applications.
     *
     * @param roomId             the room that is now fully booked for the period
     * @param academicYear       the target academic year
     * @param semester           the target semester
     * @param approvedBookingId  the booking that was just approved (exempt from rejection)
     * @param reason             rejection message shown to the student
     * @return number of bookings rejected
     */
    @Modifying
    @Query("""
            UPDATE Booking b
            SET b.status         = 'REJECTED',
                b.rejectedReason = :reason,
                b.rejectedAt     = :now
            WHERE b.room.id      = :roomId
              AND b.academicYear = :academicYear
              AND b.semester     = :semester
              AND b.status       = 'PENDING'
              AND b.id           != :approvedBookingId
            """)
    int rejectOtherPendingForRoom(
            @Param("roomId")            UUID   roomId,
            @Param("academicYear")      String academicYear,
            @Param("semester")          String semester,
            @Param("approvedBookingId") UUID   approvedBookingId,
            @Param("reason")            String reason,
            @Param("now")               LocalDateTime now
    );

    // -------------------------------------------------------------------------
    // Manager reads
    // -------------------------------------------------------------------------

    /**
     * PENDING bookings for hostels managed by this manager, oldest first (FIFO).
     * Waitlist-drafted bookings are sorted first so managers act on them promptly.
     */
    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.student
            JOIN FETCH b.room r
            JOIN FETCH r.hostel h
            WHERE h.manager.id = :managerId
              AND b.status = 'PENDING'
            ORDER BY b.isWaitlistDraft DESC, b.requestedAt ASC
            """)
    Page<Booking> findPendingByManagerId(@Param("managerId") UUID managerId, Pageable pageable);

    @Query("""
        SELECT b FROM Booking b
        JOIN FETCH b.student
        JOIN FETCH b.room r
        JOIN FETCH r.hostel h
        WHERE h.id = :hostelId
           AND (CAST(:status AS string) IS NULL OR b.status = :status)
        ORDER BY b.requestedAt DESC
        """)
    Page<Booking> findByHostelId(
            @Param("hostelId") UUID hostelId,
            @Param("status")   BookingStatus status,
            Pageable pageable
    );


    // -------------------------------------------------------------------------
    // Sweeper queries
    // -------------------------------------------------------------------------

    /**
     * APPROVED bookings whose payment grace period has elapsed with no paymentRef.
     * Processed by {@code BookingExpiredSweeper} → status moves to EXPIRED.
     */
    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.room r
            JOIN FETCH r.hostel
            JOIN FETCH b.student
            WHERE b.status           = 'APPROVED'
              AND b.paymentExpiresAt IS NOT NULL
              AND b.paymentExpiresAt  < :now
              AND (b.paymentRef IS NULL OR b.paymentRef = '')
            """)
    List<Booking> findExpiredUnpaidBookings(@Param("now") LocalDateTime now);

    /**
     * Auto-drafted PENDING bookings whose manager action deadline has elapsed.
     * Processed by {@code BookingExpiredSweeper} → status moves to REJECTED,
     * and the next student on the waitlist is promoted.
     */
    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.room r
            JOIN FETCH r.hostel
            JOIN FETCH b.student
            WHERE b.status           = 'PENDING'
              AND b.isWaitlistDraft  = TRUE
              AND b.pendingExpiresAt IS NOT NULL
              AND b.pendingExpiresAt  < :now
            """)
    List<Booking> findExpiredWaitlistDrafts(@Param("now") LocalDateTime now);

    // -------------------------------------------------------------------------
    // Analytics and roommate matching
    // -------------------------------------------------------------------------

    @Query("""
            SELECT b FROM Booking b
            WHERE b.room.id = :roomId
              AND b.status IN ('APPROVED', 'CHECKED_IN')
            """)
    List<Booking> findActiveByRoomId(@Param("roomId") UUID roomId);

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

    boolean existsByStudentIdAndStatusAndRoom_Hostel_Id(
            UUID studentId, BookingStatus status, UUID hostelId);

    @Query("SELECT b FROM Booking b WHERE b.status = 'CHECKED_IN' AND b.student.id = :userId")
    List<Booking> findCurrentByUserId(@Param("userId") UUID userId);

    @Query("SELECT DISTINCT h FROM Booking b " +
            "JOIN b.room r " +
            "JOIN r.hostel h " +
            "WHERE b.status = 'CHECKED_IN' AND b.student.id = :userId")
    List<Hostel> findStudentActiveHostels(@Param("userId") UUID userId);


    @Query("SELECT DISTINCT b.room FROM Booking b " +
            "WHERE b.status = 'CHECKED_IN' " +
            "AND b.student.id = :userId " +
            "AND b.room.hostel.id = :hostelId")
    List<Room> findStudentActiveRooms(@Param("userId") UUID userId, @Param("hostelId") UUID hostelId);

}