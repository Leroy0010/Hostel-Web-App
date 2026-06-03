package com.leroy.hostelbackend.module.complaint.repository;

import com.leroy.hostelbackend.module.complaint.model.ComplaintReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ComplaintReactionRepository extends JpaRepository<ComplaintReaction, UUID> {

    Optional<ComplaintReaction> findByComplaintIdAndUserId(UUID complaintId, UUID userId);

    /** Net score: upvotes - downvotes. */
    @Query("""
            SELECT
              COALESCE(SUM(CASE WHEN r.isUpvote = true  THEN 1 ELSE 0 END), 0) -
              COALESCE(SUM(CASE WHEN r.isUpvote = false THEN 1 ELSE 0 END), 0)
            FROM ComplaintReaction r
            WHERE r.complaint.id = :complaintId
            """)
    long getNetScore(@Param("complaintId") UUID complaintId);

    long countByComplaintIdAndIsUpvoteTrue(UUID complaintId);
    long countByComplaintIdAndIsUpvoteFalse(UUID complaintId);
}
