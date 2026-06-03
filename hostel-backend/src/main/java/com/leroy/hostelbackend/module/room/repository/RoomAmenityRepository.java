package com.leroy.hostelbackend.module.room.repository;

import com.leroy.hostelbackend.module.room.model.RoomAmenity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository for {@link RoomAmenity} entities.
 *
 * <p>Amenities are always loaded as a batch for a given room, so the
 * {@code findByRoomId} query uses a plain {@code WHERE} clause — the amenity list
 * is then assembled in Java. This avoids a Cartesian product when combined
 * with the room's other associations.
 */
public interface RoomAmenityRepository extends JpaRepository<RoomAmenity, UUID> {

    /** All amenities for a room — used when building the room detail DTO. */
    List<RoomAmenity> findByRoomId(UUID roomId);

    /** Bulk-delete all amenities for a room before replacing them. */
    @Modifying
    @Query("DELETE FROM RoomAmenity a WHERE a.room.id = :roomId")
    void deleteAllByRoomId(@Param("roomId") UUID roomId);

    /** Existence check to prevent duplicate amenity entries. */
    boolean existsByRoomIdAndAmenityIgnoreCase(UUID roomId, String amenity);
}