package com.leroy.hostelbackend.module.map.repository;

import com.leroy.hostelbackend.module.map.model.Landmark;
import com.leroy.hostelbackend.module.map.model.LandmarkCategory;
import org.springframework.data.jpa.repository.JpaRepository;
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
public interface LandmarkRepository extends JpaRepository<Landmark, UUID> {

    /**
     * All landmarks — used to populate the full campus map on initial load.
     * The frontend filters by category client-side for the initial render;
     * {@link #findByCategory} is used for the server-side filter endpoint.
     */
    List<Landmark> findAllByOrderByNameAsc();

    /**
     * Landmarks filtered by category — for map filter chips (e.g. "Show Libraries").
     */
    List<Landmark> findByCategoryOrderByNameAsc(LandmarkCategory category);

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
            SELECT ST_Distance(
                h.location::geography,
                l.location::geography
            ) AS distance_metres
            FROM   hostels h,
                   landmarks l
            WHERE  h.id   = :hostelId
              AND  l.id   = :landmarkId
              AND  h.location IS NOT NULL
            """, nativeQuery = true)
    Double calculateDistanceMetres(
            @Param("hostelId")   UUID hostelId,
            @Param("landmarkId") UUID landmarkId
    );

    /**
     * Returns all landmarks within a given radius of a hostel, ordered nearest first.
     * Useful for the "nearby landmarks" card on the hostel detail page.
     *
     * @param hostelId       UUID of the reference hostel
     * @param radiusMetres   maximum distance in metres (e.g. 1000 for 1 km)
     */
    @Query(value = """
            SELECT l.*
            FROM   landmarks l,
                   hostels   h
            WHERE  h.id = :hostelId
              AND  h.location IS NOT NULL
              AND  ST_DWithin(
                       h.location::geography,
                       l.location::geography,
                       :radiusMetres
                   )
            ORDER BY ST_Distance(h.location::geography, l.location::geography) ASC
            """, nativeQuery = true)
    List<Landmark> findNearbyLandmarks(
            @Param("hostelId")     UUID   hostelId,
            @Param("radiusMetres") double radiusMetres
    );
}