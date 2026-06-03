package com.leroy.hostelbackend.module.complaint.repository;

import com.leroy.hostelbackend.module.complaint.model.Complaint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ComplaintRepository extends JpaRepository<Complaint, UUID> {

    @Query("""
            SELECT c FROM Complaint c
            JOIN FETCH c.author
            JOIN FETCH c.hostel
            LEFT JOIN FETCH c.room
            WHERE c.id = :id
            """)
    Optional<Complaint> findByIdWithDetails(@Param("id") UUID id);

    /** Manager dashboard — complaints for a hostel with optional status filter. */
    @Query("""
            SELECT c FROM Complaint c
            JOIN FETCH c.author
            LEFT JOIN FETCH c.room
            WHERE c.hostel.id = :hostelId
              AND (:status IS NULL OR c.status = :status)
            ORDER BY c.createdAt DESC
            """)
    Page<Complaint> findByHostelId(
            @Param("hostelId") UUID hostelId,
            @Param("status")   String status,
            Pageable pageable
    );

    /** Student's own complaints. */
    @Query("""
            SELECT c FROM Complaint c
            JOIN FETCH c.hostel
            LEFT JOIN FETCH c.room
            WHERE c.author.id = :authorId
            ORDER BY c.createdAt DESC
            """)
    Page<Complaint> findByAuthorId(@Param("authorId") UUID authorId, Pageable pageable);
}



