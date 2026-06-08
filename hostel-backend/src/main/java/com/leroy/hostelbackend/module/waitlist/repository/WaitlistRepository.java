package com.leroy.hostelbackend.module.waitlist.repository;

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
 * Repository for period-scoped {@link Waitlist} entries.
 *
 * <p>All queries are scoped to {@code (hostelId, academicYear, semester)} so that
 * a student waiting for FIRST semester of 2025/2026 does not interfere with a
 * student waiting for SECOND semester of 2026/2027 at the same hostel.
 */
public interface WaitlistRepository extends JpaRepository<Waitlist, UUID> {

    /**
     * Next un-notified student in line for a hostel+period.
     * Used by {@code WaitlistService.promoteNextInLine()} when a bed is freed.
     */
    @Query("""
            SELECT w FROM Waitlist w
            JOIN FETCH w.student
            JOIN FETCH w.hostel
            WHERE w.hostel.id   = :hostelId
              AND w.academicYear = :academicYear
              AND w.semester     = :semester
              AND w.notified     = false
            ORDER BY w.position ASC
            LIMIT 1
            """)
    Optional<Waitlist> findNextInLine(
            @Param("hostelId")    UUID hostelId,
            @Param("academicYear") String academicYear,
            @Param("semester")     String semester
    );

    /**
     * Finds an existing entry for a student+hostel+period triple.
     * Enforces the one-entry-per-student-per-period rule.
     */
    @Query("""
            SELECT w FROM Waitlist w
            JOIN FETCH w.student
            JOIN FETCH w.hostel
            WHERE w.student.id  = :studentId
              AND w.hostel.id   = :hostelId
              AND w.academicYear = :academicYear
              AND w.semester     = :semester
            """)
    Optional<Waitlist> findByStudentIdAndHostelIdAndPeriod(
            @Param("studentId")    UUID   studentId,
            @Param("hostelId")     UUID   hostelId,
            @Param("academicYear") String academicYear,
            @Param("semester")     String semester
    );

    /**
     * Paginated waitlist for a hostel+period in position order.
     * Used by managers to see who is queued for a specific semester.
     */
    @Query("""
            SELECT w FROM Waitlist w
            JOIN FETCH w.student
            WHERE w.hostel.id   = :hostelId
              AND w.academicYear = :academicYear
              AND w.semester     = :semester
            ORDER BY w.position ASC
            """)
    Page<Waitlist> findByHostelIdAndPeriodOrderByPosition(
            @Param("hostelId")    UUID hostelId,
            @Param("academicYear") String academicYear,
            @Param("semester")     String semester,
            Pageable pageable
    );

    /**
     * All waitlist entries for a student across all hostels and periods.
     */
    @Query("""
            SELECT w FROM Waitlist w
            JOIN FETCH w.hostel
            WHERE w.student.id = :studentId
            ORDER BY w.joinedAt ASC
            """)
    Page<Waitlist> findByStudentId(@Param("studentId") UUID studentId, Pageable pageable);

    /**
     * Total entries in a hostel+period queue — used to set the next position.
     */
    long countByHostelIdAndAcademicYearAndSemester(
            UUID hostelId, String academicYear, String semester);

    /**
     * Shifts all positions above {@code removedPosition} down by one for a specific period.
     * Keeps ranks contiguous with no gaps.
     */
    @Modifying
    @Query("""
            UPDATE Waitlist w
            SET w.position = w.position - 1
            WHERE w.hostel.id   = :hostelId
              AND w.academicYear = :academicYear
              AND w.semester     = :semester
              AND w.position    > :removedPosition
            """)
    void decrementPositionsAfter(
            @Param("hostelId")        UUID   hostelId,
            @Param("academicYear")    String academicYear,
            @Param("semester")        String semester,
            @Param("removedPosition") int    removedPosition
    );
}