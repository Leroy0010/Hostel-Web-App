package com.leroy.hostelbackend.module.room.repository;

import com.leroy.hostelbackend.module.room.model.Room;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Room} entities.
 *
 * <p><strong>N+1 prevention:</strong> Every list query eagerly fetches
 * {@code hostel} with a {@code JOIN FETCH} so Hibernate issues a single
 * SQL statement per call.
 *
 * <p><strong>Concurrency — why {@code PESSIMISTIC_WRITE} not
 * {@code PESSIMISTIC_FORCE_INCREMENT}?</strong>
 * {@code PESSIMISTIC_FORCE_INCREMENT} increments the {@code @Version}
 * column even when no data changes, creating spurious
 * {@code OptimisticLockException}s on concurrent reads of the same room.
 * {@code PESSIMISTIC_WRITE} acquires a row-level exclusive lock without
 * bumping the version unless a field actually changes — the correct
 * behaviour for serialising concurrent approvals.
 */
public interface RoomRepository extends JpaRepository<Room, UUID>,
        JpaSpecificationExecutor<Room> {

    /**
     * All rooms in a hostel with their hostel loaded.
     * Used on the manager's room management page.
     *
     * @param hostelId the hostel UUID
     */
    @Query("SELECT r FROM Room r JOIN FETCH r.hostel WHERE r.hostel.id = :hostelId")
    Page<Room> findByHostelId(@Param("hostelId") UUID hostelId, Pageable pageable);

    /**
     * Available rooms in a hostel — the primary student browsing query.
     *
     * <p>Filters to {@code status = 'AVAILABLE'} in JPQL so the query planner
     * can use the {@code idx_rooms_hostel_status} composite index.
     *
     * @param hostelId the hostel UUID
     */
    @Query("""
            SELECT r FROM Room r
            JOIN FETCH r.hostel
            WHERE r.hostel.id = :hostelId
              AND r.status    = 'AVAILABLE'
            """)
    Page<Room> findAvailableByHostelId(
            @Param("hostelId") UUID hostelId,
            Pageable pageable
    );

    /**
     * Filtered available rooms — supports student browsing with room-type
     * and price-range filters. Null parameters are treated as "no filter".
     *
     * @param hostelId the hostel UUID
     * @param roomType optional room type filter (e.g. {@code "DOUBLE"}); null = any
     * @param maxPrice optional maximum price per semester; null = any
     */
    @Query("""
            SELECT r FROM Room r
            JOIN FETCH r.hostel
            WHERE r.hostel.id = :hostelId
              AND r.status    = 'AVAILABLE'
              AND (:roomType IS NULL OR r.roomType = :roomType)
              AND (:maxPrice IS NULL OR r.pricePerSemester <= :maxPrice)
            """)
    Page<Room> findAvailableFiltered(
            @Param("hostelId") UUID       hostelId,
            @Param("roomType") String     roomType,
            @Param("maxPrice") BigDecimal maxPrice,
            Pageable pageable
    );

    /**
     * Loads a room by ID with a {@link LockModeType#PESSIMISTIC_WRITE} lock.
     *
     * <p>Used during booking approval to serialise concurrent manager approvals
     * for the same room. The lock ensures that two managers cannot simultaneously
     * approve the last bed in a room — the second transaction blocks until the
     * first commits, then re-runs the period-capacity check and finds the room full.
     *
     * <p><strong>Lock mode rationale:</strong> {@code PESSIMISTIC_WRITE} acquires
     * an exclusive row lock ({@code SELECT ... FOR UPDATE}) without bumping the
     * {@code @Version} counter unless a field actually changes. This is correct
     * because we only want the lock for serialisation — we do not want spurious
     * version increments from read-only contention.
     *
     * @param id the room UUID
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r JOIN FETCH r.hostel WHERE r.id = :id")
    Optional<Room> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Existence check used when creating a room — prevents duplicate room
     * numbers within the same hostel (case-insensitive).
     *
     * @param hostelId   the hostel UUID
     * @param roomNumber the room number to check
     */
    boolean existsByHostelIdAndRoomNumberIgnoreCase(UUID hostelId, String roomNumber);

    /**
     * Full room detail with its hostel loaded.
     * Used by {@code BookingService} when creating a booking to access
     * both the room and its hostel in a single query.
     *
     * @param id the room UUID
     */
    @Query("SELECT r FROM Room r JOIN FETCH r.hostel WHERE r.id = :id")
    Optional<Room> findByIdWithHostel(@Param("id") UUID id);
}