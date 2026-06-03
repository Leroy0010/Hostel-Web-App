package com.leroy.hostelbackend.module.hostel.repository;

import com.leroy.hostelbackend.module.hostel.model.Hostel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Hostel} entities.
 *
 * <p><strong>N+1 prevention:</strong> All queries that load the {@code manager}
 * association use {@code JOIN FETCH} so Hibernate issues one query, not one per hostel.
 */
public interface HostelRepository extends JpaRepository<Hostel, UUID> {

    /**
     * Paginated list of active hostels with their manager eagerly loaded.
     * Used by the public hostel listing endpoint.
     */
    @Query("SELECT h FROM Hostel h LEFT JOIN FETCH h.manager WHERE h.isActive = true")
    Page<Hostel> findAllActiveWithManager(Pageable pageable);

    /**
     * Paginated list of ALL hostels (active + inactive) for the admin dashboard.
     */
    @Query("SELECT h FROM Hostel h LEFT JOIN FETCH h.manager")
    Page<Hostel> findAllWithManager(Pageable pageable);

    /**
     * Full hostel detail by ID — always fetches manager in the same query.
     */
    @Query("SELECT h FROM Hostel h LEFT JOIN FETCH h.manager WHERE h.id = :id")
    Optional<Hostel> findByIdWithManager(@Param("id") UUID id);

    /**
     * All hostels managed by a specific manager. Used to validate manager access.
     */
    @Query("SELECT h FROM Hostel h WHERE h.manager.id = :managerId AND h.isActive = true")
    Page<Hostel> findByManagerId(@Param("managerId") UUID managerId, Pageable pageable);

    /** Existence check for name uniqueness (case-insensitive). */
    boolean existsByNameIgnoreCase(String name);
}