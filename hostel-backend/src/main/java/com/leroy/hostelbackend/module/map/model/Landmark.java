package com.leroy.hostelbackend.module.map.model;

import com.leroy.hostelbackend.module.hostel.model.Hostel;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.locationtech.jts.geom.Point;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A named point of interest on the UCC campus stored as a PostGIS geometry point.
 *
 * <p>Landmarks are seeded by an ADMIN via the {@code POST /admin/landmarks} endpoint
 * using real GPS coordinates. The map feature then lets students calculate the
 * walking distance from any hostel to any landmark.
 *
 * <p><strong>Coordinate convention (PostGIS):</strong>
 * <ul>
 *   <li>{@code Point.getX()} = longitude</li>
 *   <li>{@code Point.getY()} = latitude</li>
 * </ul>
 *
 * <p><strong>Distance query:</strong>
 * {@code ST_Distance(h.location::geography, l.location::geography)} returns
 * metres when both columns are cast to {@code geography}. The service wraps
 * this in a named JPQL/native query.
 *
 * <p><strong>SRID 4326:</strong> WGS 84 — the same coordinate system used by
 * Google Maps, OpenStreetMap, and the Mapbox/Leaflet frontend.
 *
 * <p><strong>LandmarkCategory values</strong> (VARCHAR, Java enum enforcer):
 * ACADEMIC | LIBRARY | ADMINISTRATIVE | CAFETERIA | MEDICAL | SPORTS | HOSTEL | OTHER
 */
@Getter
@Setter
@Entity
@Table(name = "landmarks")
public class Landmark {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    /**
     * Category for map filtering and icon selection.
     * Values: ACADEMIC | LIBRARY | ADMINISTRATIVE | CAFETERIA | MEDICAL | SPORTS | HOSTEL | OTHER
     * Stored as VARCHAR; Java enum {@link LandmarkCategory} is the enforcer.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private LandmarkCategory category = LandmarkCategory.OTHER;

    /**
     * PostGIS GEOGRAPHY point, WGS 84 (SRID 4326).
     * Mapped by Hibernate Spatial — requires the {@code hibernate-spatial} dependency.
     * Note: the schema uses {@code GEOGRAPHY} for the landmarks table and
     * {@code GEOMETRY} for the hostels table. The distance query casts both to
     * geography to get metre-accurate results.
     */
    @Column(name = "location", nullable = false)
    private Point location;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hostel_id")
    private Hostel hostel;


}