package com.leroy.hostelbackend.module.complaint.model;

import com.leroy.hostelbackend.module.user.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A photo or document uploaded as evidence for a complaint.
 * {@code fileUrl} is a Cloudinary URL returned by the signed direct-upload flow
 * (see {@code CloudinaryController}).
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

    /**
     * The user who uploaded this specific attachment — the complaint's author,
     * or the manager/admin who added supporting evidence of their own. Deletion
     * is restricted to this user only (see {@code ComplaintService#deleteAttachment}),
     * not to the complaint's author or to managers/admins generally, since one
     * privileged user's evidence should not be removable by another.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by", nullable = false)
    private User submittedBy;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;
}