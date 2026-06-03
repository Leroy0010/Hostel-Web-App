package com.leroy.hostelbackend.module.room.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "room_amenities")
public class RoomAmenity {
    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "amenity", nullable = false)
    private String amenity;

    /**
     * Optional URL to an icon/image representing this amenity.
     * Stored as TEXT (S3 URL or key). May be {@code null}.
     */
    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;
}