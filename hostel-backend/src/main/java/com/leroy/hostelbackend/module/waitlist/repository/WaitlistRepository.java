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
 * Repository for {@link Waitlist} entries.
 *
 * <p>Key queries:
 * <ul>
 *   <li>{@link #findNextInLine} — used by {@code WaitlistService.notifyNextInLine()}
 *       to find the student at position 1 who has not yet been notified.</li>
 *   <li>{@link #decrementPositionsAfter} — bulk-shifts positions after a removal
 *       so ranks stay contiguous with no gaps.</li>
 *   <li>{@link #countByHostelId} — used to assign the next position when a student joins.</li>
 * </ul>
 */
public interface WaitlistRepository extends JpaRepository<Waitlist, UUID> {

    /**
     * Finds the next student in line for a hostel who hasn't been notified yet.
     * Used by {@code WaitlistService.notifyNextInLine()} when a bed becomes free.
     */
    @Query("""
            SELECT w FROM Waitlist w
            JOIN FETCH w.student
            JOIN FETCH w.hostel
            WHERE w.hostel.id = :hostelId
              AND w.notified = false
            ORDER BY w.position ASC
            LIMIT 1
            """)
    Optional<Waitlist> findNextInLine(@Param("hostelId") UUID hostelId);

    /**
     * Finds an existing entry for a student+hostel pair.
     * Used to enforce the one-entry-per-student-per-hostel rule.
     */
    @Query("""
            SELECT w FROM Waitlist w
            JOIN FETCH w.student
            JOIN FETCH w.hostel
            WHERE w.student.id = :studentId AND w.hostel.id = :hostelId
            """)
    Optional<Waitlist> findByStudentIdAndHostelId(
            @Param("studentId") UUID studentId,
            @Param("hostelId") UUID hostelId
    );

    /**
     * Paginated waitlist for a hostel, ordered by position.
     * Used by managers to see who is waiting.
     */
    @Query("""
            SELECT w FROM Waitlist w
            JOIN FETCH w.student
            WHERE w.hostel.id = :hostelId
            ORDER BY w.position ASC
            """)
    Page<Waitlist> findByHostelIdOrderByPosition(
            @Param("hostelId") UUID hostelId,
            Pageable pageable
    );

    /**
     * A student's own waitlist entries across all hostels.
     */
    @Query("""
            SELECT w FROM Waitlist w
            JOIN FETCH w.hostel
            WHERE w.student.id = :studentId
            ORDER BY w.joinedAt ASC
            """)
    Page<Waitlist> findByStudentId(@Param("studentId") UUID studentId, Pageable pageable);

    /**
     * Total entries in a hostel's waitlist.
     * Used to compute the next available position when a student joins.
     */
    long countByHostelId(UUID hostelId);

    /**
     * Shifts all positions above {@code removedPosition} down by one after a removal.
     * Keeps positions contiguous — no gaps after a student leaves the list.
     *
     * <p>Example: if position 2 is removed from a list of 4, positions 3 and 4
     * become 2 and 3.
     */
    @Modifying
    @Query("""
            UPDATE Waitlist w
            SET w.position = w.position - 1
            WHERE w.hostel.id = :hostelId
              AND w.position > :removedPosition
            """)
    void decrementPositionsAfter(
            @Param("hostelId") UUID hostelId,
            @Param("removedPosition") int removedPosition
    );

    /**
     * Resets the {@code notified} flag for all un-notified entries in a hostel.
     * Called when a new vacancy opens so everyone still waiting can be re-considered.
     */
    @Modifying
    @Query("""
            UPDATE Waitlist w
            SET w.notified = false
            WHERE w.hostel.id = :hostelId
              AND w.notified = true
            """)
    void resetNotifiedFlags(@Param("hostelId") UUID hostelId);
}