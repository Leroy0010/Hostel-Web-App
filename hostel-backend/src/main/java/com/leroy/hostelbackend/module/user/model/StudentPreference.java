package com.leroy.hostelbackend.module.user.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "student_preferences")
public class StudentPreference {
    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "tags", nullable = false)
    private List<String> tags;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

}