package com.leroy.hostelbackend.module.room.model;

import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.room.dto.CreateRoomRequest;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.*;
import org.jspecify.annotations.NonNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "rooms")
public class Room {
    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "hostel_id", nullable = false)
    private Hostel hostel;


    @Column(name = "room_number", nullable = false)
    private String roomNumber;

    @Column(name = "room_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private RoomType roomType;

    @Column(name = "capacity", nullable = false)
    private Short capacity;

    @Column(name = "current_occupancy", nullable = false)
    private Short currentOccupancy;

    @Column(name = "price_per_semester", nullable = false)
    private BigDecimal pricePerSemester;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private RoomStatus status;

    @Column(name = "floor_number")
    private Short floorNumber;

    /**
     * URL of the room's cover image (S3 key or full URL).
     * Required when creating a room — stored as TEXT in PostgreSQL.
     */
    @Column(name = "image_url")
    private String imageUrl;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version;

    @Column(name = "created_at", nullable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public static @NonNull Room createRoom(CreateRoomRequest request, Hostel hostel) {
        var room = new Room();
        room.setHostel(hostel);
        room.setRoomNumber(request.roomNumber().trim());
        room.setRoomType(request.roomType());
        room.setCapacity(request.capacity());
        room.setCurrentOccupancy((short) 0);
        room.setPricePerSemester(request.pricePerSemester());
        room.setStatus(RoomStatus.AVAILABLE);
        room.setImageUrl(request.imageUrl());
        if (request.floorNumber() != null) {
            room.setFloorNumber(request.floorNumber().shortValue());
        }
        return room;
    }
}