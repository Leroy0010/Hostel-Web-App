package com.leroy.hostelbackend.module.map.repository;

import com.leroy.hostelbackend.module.map.dto.NearbyLandmarkQueryResult;
import com.leroy.hostelbackend.module.map.model.Landmark;
import com.leroy.hostelbackend.module.map.model.LandmarkCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository for {@link Landmark} entities.
 *
 * <p><strong>Distance query design:</strong> The {@link #calculateDistanceMetres}
 * query is native SQL because JPQL does not support PostGIS functions.
 * It casts both columns to {@code geography} before calling {@code ST_Distance}
 * so the result is in metres regardless of whether the underlying column type
 * is {@code GEOMETRY} or {@code GEOGRAPHY}.
 *
 * <p>The hostel's {@code location} column uses {@code GEOMETRY(POINT, 4326)}
 * while the landmark's uses {@code GEOGRAPHY(POINT, 4326)} — the explicit cast
 * in the query bridges that difference safely.
 */
public interface LandmarkRepository extends JpaRepository<Landmark, UUID>, JpaSpecificationExecutor<Landmark> {


    /**
     * Existence check used before persisting — prevents duplicate landmark names
     * for the same category (e.g. two rows both called "Sam Jonah Library").
     */
    boolean existsByNameIgnoreCaseAndCategory(String name, LandmarkCategory category);

    /**
     * Calculates the straight-line distance in <strong>metres</strong> between
     * a hostel and a landmark using PostGIS {@code ST_Distance}.
     *
     * <p>Both arguments are cast to {@code geography} to ensure metre-accurate
     * spheroidal distance calculation (not flat Cartesian distance).
     *
     * <p>Returns {@code null} if either the hostel or landmark has a null location.
     *
     * @param hostelId   UUID of the hostel
     * @param landmarkId UUID of the landmark
     * @return distance in metres, or {@code null} if either location is unset
     */
    @Query(value = """
            SELECT ST_Distance(h.location::geography, l.location::geography) AS distance_metres
            FROM   hostels h, landmarks l
            WHERE  h.id   = :hostelId
              AND  l.id   = :landmarkId
              AND  h.location IS NOT NULL
            """, nativeQuery = true)
    Double calculateDistanceMetres(@Param("hostelId") UUID hostelId, @Param("landmarkId") UUID landmarkId);

    /**
     * Optimized: Returns landmarks and distances simultaneously.
     * Prevents self-distance matches via hostel_id checks and name alignment rules.
     */
    @Query(value = """
            SELECT l.id AS id,
                   l.name AS name,
                   l.category AS category,
                   l.description AS description,
                   ST_Y(l.location) AS latitude,
                   ST_X(l.location) AS longitude,
                   l.hostel_id AS hostel_id,
                   ST_Distance(h.location::geography, l.location::geography) AS distance_metres
            FROM   landmarks l
            JOIN   hostels h ON h.id = :hostelId
            WHERE  h.location IS NOT NULL
              -- Guardrail 1: Exclude if the landmark explicitly belongs to the requested hostel
              AND  (l.hostel_id IS NULL OR l.hostel_id != :hostelId)
              -- Guardrail 2: Fallback text safety check for matching names
              AND  LOWER(TRIM(l.name)) != LOWER(TRIM(h.name))
              -- Spatial bounding constraint using spatial indices
              AND  ST_DWithin(h.location::geography, l.location::geography, :radiusMetres)
            ORDER BY distance_metres
            """, nativeQuery = true)
    List<NearbyLandmarkQueryResult> findNearbyLandmarksWithDistance(@Param("hostelId") UUID hostelId, @Param("radiusMetres") double radiusMetres);
}