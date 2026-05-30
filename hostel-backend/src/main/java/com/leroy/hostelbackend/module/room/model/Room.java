package com.leroy.hostelbackend.module.room.model;

import com.leroy.hostelbackend.module.hostel.model.Hostel;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "rooms")
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "hostel_id", nullable = false)
    private Hostel hostel;

    @Size(max = 20)
    @NotNull
    @Column(name = "room_number", nullable = false, length = 20)
    private String roomNumber;

    @Size(max = 15)
    @NotNull
    @Column(name = "room_type", nullable = false, length = 15)
    private String roomType;

    @NotNull
    @Column(name = "capacity", nullable = false)
    private Short capacity;

    @NotNull
    @Column(name = "current_occupancy", nullable = false)
    private Short currentOccupancy;

    @NotNull
    @Column(name = "price_per_semester", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerSemester;

    @Size(max = 20)
    @NotNull
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "floor_number")
    private Short floorNumber;

    @NotNull
    @Column(name = "version", nullable = false)
    private Integer version;

    @NotNull
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @NotNull
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;


}