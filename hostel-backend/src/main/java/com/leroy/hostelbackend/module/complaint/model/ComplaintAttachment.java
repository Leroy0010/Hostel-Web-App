package com.leroy.hostelbackend.module.complaint.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A photo or document uploaded as evidence for a complaint.
 * {@code fileUrl} is an S3 URL (or key) returned by the file upload service.
 */
@Getter
@Setter
@Entity
@Table(name = "complaint_attachments")
public class ComplaintAttachment {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;

    @Column(name = "file_url", nullable = false, columnDefinition = "TEXT")
    private String fileUrl;

    /** MIME type e.g. "image/jpeg". Informational only. */
    @Column(name = "file_type")
    private String fileType;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;
}