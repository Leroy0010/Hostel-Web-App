package com.leroy.hostelbackend.module.hostel.model;

import com.leroy.hostelbackend.module.user.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.*;
import org.locationtech.jts.geom.Point;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A physical hostel on or near the UCC campus.
 *
 * <p>{@code location} is a PostGIS {@code geography(Point, 4326)} column.
 * Hibernate Spatial maps it to a JTS {@code Point} at runtime. The service
 * layer uses a {@code GeometryFactory} to build the point from lat/lon input.
 *
 * <p><strong>Factory method:</strong> {@link #createHostel} centralises construction.
 */
@Getter
@Setter
@Entity
@Table(name = "hostels")
public class Hostel {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "address", nullable = false, length = 300)
    private String address;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * PostGIS geometry point (WGS 84).
     */
    @Column(name = "location")
    private Point location;

    /**
     * Values: MALE_ONLY | FEMALE_ONLY | MIXED
     * Stored as VARCHAR and validated via the {@link GenderPolicy} Java enum in the service.
     */
    @Column(name = "gender_policy", nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private GenderPolicy genderPolicy = GenderPolicy.MIXED;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JoinColumn(name = "manager_id")
    private User manager;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // -------------------------------------------------------------------------
    // Factory method
    // -------------------------------------------------------------------------

    /**
     * Creates a new hostel entity from a validated creation request.
     * Manager and location are set separately in {@code HostelService} since they
     * require additional lookups (user fetch, JTS Point construction).
     *
     * @param request the validated creation request
     * @return an unpersisted {@link Hostel} ready for {@code hostelRepository.save()}
     */
    public static Hostel createHostel(
            com.leroy.hostelbackend.module.hostel.dto.CreateHostelRequest request
    ) {
        var hostel = new Hostel();
        hostel.setName(request.name().trim());
        hostel.setAddress(request.address().trim());
        hostel.setDescription(request.description());
        hostel.setGenderPolicy(request.genderPolicy());
        hostel.setImageUrl(request.imageUrl());
        hostel.setIsActive(true);
        return hostel;
    }
}