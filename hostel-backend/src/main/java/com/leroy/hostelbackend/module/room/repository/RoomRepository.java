package com.leroy.hostelbackend.module.room.repository;

import com.leroy.hostelbackend.module.room.model.Room;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Room} entities.
 *
 * <p><strong>N+1 prevention:</strong> Every query that renders a list eagerly fetches
 * {@code hostel} with a {@code JOIN FETCH} so Hibernate issues a single SQL statement.
 *
 * <p><strong>Optimistic locking:</strong> {@link #findByIdForUpdate} uses
 * {@link LockModeType#OPTIMISTIC_FORCE_INCREMENT} to ensure the {@code version}
 * column is incremented even if only the occupancy field changes — critical for
 * the concurrent booking guard.
 */
public interface RoomRepository extends JpaRepository<Room, UUID> {

    /**
     * All rooms in a hostel with their hostel loaded. Used by the manager dashboard.
     */
    @Query("SELECT r FROM Room r JOIN FETCH r.hostel WHERE r.hostel.id = :hostelId")
    Page<Room> findByHostelId(@Param("hostelId") UUID hostelId, Pageable pageable);

    /**
     * Available rooms in a hostel — the primary student browsing query.
     * Filters to {@code status = 'AVAILABLE'} in JPQL to leverage the
     * {@code idx_rooms_hostel_status} composite index.
     */
    @Query("""
            SELECT r FROM Room r
            JOIN FETCH r.hostel
            WHERE r.hostel.id = :hostelId
              AND r.status = 'AVAILABLE'
            """)
    Page<Room> findAvailableByHostelId(@Param("hostelId") UUID hostelId, Pageable pageable);

    /**
     * Filtered available rooms — students can filter by type and price range.
     * Null parameters are treated as "no filter" (handled by {@code :type IS NULL} trick).
     */
    @Query("""
            SELECT r FROM Room r
            JOIN FETCH r.hostel
            WHERE r.hostel.id = :hostelId
              AND r.status = 'AVAILABLE'
              AND (:roomType IS NULL OR r.roomType = :roomType)
              AND (:maxPrice IS NULL OR r.pricePerSemester <= :maxPrice)
            """)
    Page<Room> findAvailableFiltered(
            @Param("hostelId") UUID hostelId,
            @Param("roomType") String roomType,
            @Param("maxPrice") BigDecimal maxPrice,
            Pageable pageable
    );

    /**
     * Loads a room by ID with a PESSIMISTIC_WRITE lock for the booking transaction.
     * This ensures serialised access when multiple students try to book the same room.
     * The {@code @Version} optimistic lock is the first defence; this is the fallback.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.id = :id")
    Optional<Room> findByIdForUpdate(@Param("id") UUID id);

    /** Existence check used when creating a room — prevents duplicate room numbers per hostel. */
    boolean existsByHostelIdAndRoomNumberIgnoreCase(UUID hostelId, String roomNumber);

    /** Full room detail by ID with hostel loaded. */
    @Query("SELECT r FROM Room r JOIN FETCH r.hostel WHERE r.id = :id")
    Optional<Room> findByIdWithHostel(@Param("id") UUID id);
}