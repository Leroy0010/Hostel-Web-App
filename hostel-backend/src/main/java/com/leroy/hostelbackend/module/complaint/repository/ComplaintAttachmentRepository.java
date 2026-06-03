package com.leroy.hostelbackend.module.complaint.repository;

import com.leroy.hostelbackend.module.complaint.model.ComplaintAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ComplaintAttachmentRepository extends JpaRepository<ComplaintAttachment, UUID> {
    List<ComplaintAttachment> findByComplaintId(UUID complaintId);
}
