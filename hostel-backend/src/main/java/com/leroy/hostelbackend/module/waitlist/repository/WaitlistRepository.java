package com.leroy.hostelbackend.module.waitlist.repository;

import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.waitlist.model.Waitlist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Waitlist} entries.
 *
 * <p>All querying and position management is scoped to
 * {@code (hostelId, roomType, academicYear, semester)}. This is the "Goldilocks"
 * scope: broad enough that students only need one waitlist entry per room type
 * per period, narrow enough that a freed SINGLE bed never promotes a student
 * who queued for a DOUBLE.
 *
 * <p><strong>Index backing every core query:</strong>
 * {@code idx_waitlists_period_type_position} on
 * {@code (hostel_id, room_type, academic_year, semester, position) WHERE notified = FALSE}
 * makes {@link #findNextInLine} a single index-scan lookup.
 */
public interface WaitlistRepository extends JpaRepository<Waitlist, UUID> {

    // -------------------------------------------------------------------------
    // Promotion
    // -------------------------------------------------------------------------

    /**
     * Returns the next un-notified student in line for a specific hostel,
     * room type, and academic period.
     *
     * <p>Called by {@code WaitlistService.promoteNextInLine()} every time a bed
     * is freed. The {@code roomType} parameter ensures that only students who
     * specifically queued for this room type are considered.
     *
     * @param hostelId    the hostel with a vacancy
     * @param roomType    the room type of the freed room
     * @param academicYear the target academic year
     * @param semester    the target semester
     */
    @Query("""
            SELECT w FROM Waitlist w
            JOIN FETCH w.student
            JOIN FETCH w.hostel
            WHERE w.hostel.id    = :hostelId
              AND w.roomType     = :roomType
              AND w.academicYear = :academicYear
              AND w.semester     = :semester
              AND w.notified     = false
            ORDER BY w.position ASC
            LIMIT 1
            """)
    Optional<Waitlist> findNextInLine(
            @Param("hostelId")     UUID     hostelId,
            @Param("roomType")     RoomType roomType,
            @Param("academicYear") String   academicYear,
            @Param("semester")     String   semester
    );

    // -------------------------------------------------------------------------
    // Duplicate guard
    // -------------------------------------------------------------------------

    /**
     * Finds an existing entry for the exact (student, hostel, roomType, period) key.
     * Used before inserting to give a clear error rather than a constraint violation.
     */
    @Query("""
            SELECT w FROM Waitlist w
            JOIN FETCH w.student
            JOIN FETCH w.hostel
            WHERE w.student.id   = :studentId
              AND w.hostel.id    = :hostelId
              AND w.roomType     = :roomType
              AND w.academicYear = :academicYear
              AND w.semester     = :semester
            """)
    Optional<Waitlist> findByStudentIdAndHostelIdAndPeriod(
            @Param("studentId")    UUID     studentId,
            @Param("hostelId")     UUID     hostelId,
            @Param("roomType")     RoomType roomType,
            @Param("academicYear") String   academicYear,
            @Param("semester")     String   semester
    );

    // -------------------------------------------------------------------------
    // Manager / student reads
    // -------------------------------------------------------------------------

    /**
     * Paginated waitlist for a hostel + room type + period, position order.
     * Used on the manager's dashboard. {@code roomType} may be null to show all types.
     */
    @Query("""
            SELECT w FROM Waitlist w
            JOIN FETCH w.student
            WHERE w.hostel.id    = :hostelId
              AND (:roomType IS NULL OR w.roomType = :roomType)
              AND w.academicYear = :academicYear
              AND w.semester     = :semester
            ORDER BY w.roomType ASC, w.position ASC
            """)
    Page<Waitlist> findByHostelIdAndPeriodOrderByPosition(
            @Param("hostelId")     UUID     hostelId,
            @Param("roomType")     RoomType roomType,
            @Param("academicYear") String   academicYear,
            @Param("semester")     String   semester,
            Pageable pageable
    );

    /**
     * All waitlist entries for a student, across all hostels and periods.
     */
    @Query("""
            SELECT w FROM Waitlist w
            JOIN FETCH w.hostel
            WHERE w.student.id = :studentId
            ORDER BY w.joinedAt ASC
            """)
    Page<Waitlist> findByStudentId(
            @Param("studentId") UUID studentId,
            Pageable pageable
    );

    // -------------------------------------------------------------------------
    // Counting — used to assign the next position and for status queries
    // -------------------------------------------------------------------------

    /**
     * Queue depth for a specific hostel + room type + period.
     * Used when a student joins to compute their position number.
     */
    long countByHostelIdAndRoomTypeAndAcademicYearAndSemester(
            UUID hostelId, RoomType roomType, String academicYear, String semester);

    // -------------------------------------------------------------------------
    // Position integrity
    // -------------------------------------------------------------------------

    /**
     * Shifts all positions above {@code removedPosition} down by one within
     * the same (hostel, roomType, period) queue. Keeps ranks contiguous — no gaps.
     *
     * <p>Called in the same transaction as every deletion (leave, promotion,
     * manager force-remove) to prevent race conditions.
     */
    @Modifying
    @Query("""
            UPDATE Waitlist w
            SET    w.position = w.position - 1
            WHERE  w.hostel.id    = :hostelId
              AND  w.roomType     = :roomType
              AND  w.academicYear = :academicYear
              AND  w.semester     = :semester
              AND  w.position     > :removedPosition
            """)
    void decrementPositionsAfter(
            @Param("hostelId")        UUID     hostelId,
            @Param("roomType")        RoomType roomType,
            @Param("academicYear")    String   academicYear,
            @Param("semester")        String   semester,
            @Param("removedPosition") int      removedPosition
    );
}