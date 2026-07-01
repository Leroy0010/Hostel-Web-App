package com.leroy.hostelbackend.module.preference.model;

import com.leroy.hostelbackend.module.user.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Array;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Lifestyle preference tags for a student.
 *
 * <p>Stored as a PostgreSQL {@code TEXT[]} array in the {@code student_preferences}
 * table. The GIN index on {@code tags} (created in {@code indexes.sql}) makes the
 * {@code &&} (array overlap) operator fast — used by the roommate matching query.
 *
 * <p><strong>Hypersistence Utilities:</strong> The {@code TEXT[]} array is mapped
 * with {@link SqlTypes} from {@code io.hypersistence:hypersistence-utils-hibernate-63}.
 * Add this dependency to {@code pom.xml}:
 * <pre>
 * {@code
 * <dependency>
 *     <groupId>io.hypersistence</groupId>
 *     <artifactId>hypersistence-utils-hibernate-63</artifactId>
 *     <version>3.9.9</version>
 * </dependency>
 * }
 * </pre>
 *
 * <p><strong>Allowed tags</strong> (validated in the service via {@link PreferenceTag}):
 * <ul>
 *   <li>NIGHT_OWL, EARLY_BIRD</li>
 *   <li>QUIET, SOCIAL</li>
 *   <li>NEAT, MESSY</li>
 *   <li>STUDIOUS, RELAXED</li>
 *   <li>NON_SMOKER, SMOKER</li>
 * </ul>
 *
 * <p>One row per student (UNIQUE on {@code student_id}). The row is created on
 * first save and upserted on subsequent updates.
 */
@Getter
@Setter
@Entity
@Table(name = "student_preferences")
public class StudentPreference {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /**
     * The student who owns these preferences.
     * UNIQUE constraint on {@code student_id} ensures one row per student.
     */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false, unique = true)
    private User student;

    /**
     * Lifestyle tags stored as a PostgreSQL TEXT[].
     * The GIN index makes overlap queries ({@code tags && ARRAY[...]}) sub-millisecond.
     */
    @Column(name = "tags", nullable = false, columnDefinition = "text[]")
    @Array(length = 100)
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Enumerated(EnumType.STRING)
    private List<PreferenceTag> tags = new ArrayList<>();

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}