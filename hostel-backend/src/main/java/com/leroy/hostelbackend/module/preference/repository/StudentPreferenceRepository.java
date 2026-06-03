package com.leroy.hostelbackend.module.preference.repository;

import com.leroy.hostelbackend.module.preference.model.StudentPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link StudentPreference} entities.
 *
 * <p>The core roommate-matching query ({@link #findStudentsWithOverlappingTags})
 * uses a native PostgreSQL query to leverage the {@code &&} array-overlap operator,
 * which hits the GIN index on {@code student_preferences.tags} for sub-millisecond
 * lookups even on large datasets.
 *
 * <p>JPQL does not support PostgreSQL array operators — native query is the correct
 * approach here.
 */
public interface StudentPreferenceRepository extends JpaRepository<StudentPreference, UUID> {

    /** Find the preferences row for a specific student. */
    Optional<StudentPreference> findByStudentId(UUID studentId);

    /**
     * Core roommate-matching query.
     *
     * <p>Returns the UUIDs of students whose tag arrays overlap with the supplied
     * tag array. Used by {@link com.leroy.hostelbackend.module.preference.service.PreferenceService}
     * to find compatible occupants already living in a hostel.
     *
     * <p>SQL explanation:
     * <ul>
     *   <li>{@code sp.tags && CAST(:tags AS text[])} — the {@code &&} operator
     *       returns {@code true} when the two arrays share at least one element.
     *       The GIN index on {@code tags} makes this a bitmap index scan, not a seq scan.</li>
     *   <li>{@code sp.student_id != :excludeStudentId} — exclude the requesting student
     *       themselves from the result.</li>
     * </ul>
     *
     * @param tags              the requesting student's tag array as a PostgreSQL array
     *                          literal, e.g. {@code "{QUIET,NEAT}"}
     * @param excludeStudentId  the requesting student's own UUID (excluded from results)
     * @return UUIDs of students with at least one matching tag
     */
    @Query(value = """
            SELECT sp.student_id
            FROM   student_preferences sp
            WHERE  sp.tags && CAST(:tags AS text[])
              AND  sp.student_id != :excludeStudentId
            """, nativeQuery = true)
    List<UUID> findStudentsWithOverlappingTags(
            @Param("tags")              String tags,
            @Param("excludeStudentId")  UUID   excludeStudentId
    );
}