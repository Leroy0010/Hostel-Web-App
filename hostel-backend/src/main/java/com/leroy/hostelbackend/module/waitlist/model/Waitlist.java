package com.leroy.hostelbackend.module.waitlist.model;

import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.user.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "waitlists")
public class Waitlist {
    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false)
    private UUID id;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hostel_id", nullable = false)
    private Hostel hostel;


    @Column(name = "position", nullable = false)
    private Integer position;


    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt;


    @Column(name = "notified", nullable = false)
    private Boolean notified;


}