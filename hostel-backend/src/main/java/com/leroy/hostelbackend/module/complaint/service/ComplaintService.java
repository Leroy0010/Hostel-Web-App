package com.leroy.hostelbackend.module.complaint.service;

import com.leroy.hostelbackend.module.booking.service.BookingService;
import com.leroy.hostelbackend.module.complaint.dto.*;
import com.leroy.hostelbackend.module.complaint.mapper.ComplaintMapper;
import com.leroy.hostelbackend.module.complaint.model.*;
import com.leroy.hostelbackend.module.complaint.repository.*;
import com.leroy.hostelbackend.module.hostel.repository.HostelRepository;
import com.leroy.hostelbackend.module.notification.model.NotificationType;
import com.leroy.hostelbackend.module.notification.service.NotificationService;
import com.leroy.hostelbackend.module.room.repository.RoomRepository;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.exception.HostelAccessDeniedException;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Manages complaint lifecycle: creation, status transitions, reactions, and attachments.
 *
 * <p><strong>Status transitions (manager/admin only):</strong>
 * <pre>
 *   OPEN → IN_PROGRESS → RESOLVED → CLOSED
 *   OPEN → CLOSED (invalid/spam)
 * </pre>
 *
 * <p><strong>Reactions:</strong> One reaction per user per complaint.
 * Re-voting toggles the {@code isUpvote} field (UPSERT via
 * {@link ComplaintReactionRepository#findByComplaintIdAndUserId}).
 *
 * <p><strong>Attachments:</strong> File URLs are supplied by the caller after
 * uploading to S3. This service only stores the URL — it does not handle file I/O.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ComplaintService {

    private final ComplaintRepository           complaintRepository;
    private final ComplaintReactionRepository   reactionRepository;
    private final ComplaintAttachmentRepository attachmentRepository;
    private final HostelRepository              hostelRepository;
    private final RoomRepository                roomRepository;
    private final UserRepository                userRepository;
    private final ComplaintMapper               complaintMapper;
    private final NotificationService           notificationService;
    private final BookingService bookingService;

    // -------------------------------------------------------------------------
    // Student actions
    // -------------------------------------------------------------------------

    /**
     * Creates a new OPEN complaint. Any authenticated student can raise one.
     *
     * @param authorId UUID of the authenticated student
     * @param request  validated creation payload
     */
    @Transactional
    public ComplaintDto createComplaint(UUID authorId, CreateComplaintRequest request) {
        var author = userRepository.findById(authorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authorId));
        var hostel = hostelRepository.findById(request.hostelId())
                .orElseThrow(() -> new ResourceNotFoundException("Hostel not found: " + request.hostelId()));

        var complaint = new Complaint();
        complaint.setAuthor(author);
        complaint.setHostel(hostel);
        complaint.setTitle(request.title().trim());
        complaint.setDescription(request.description().trim());
        complaint.setCategory(request.category());
        complaint.setStatus(ComplaintStatus.OPEN);

        String roomNumber = null;

        if (request.roomId() != null) {
            var room = roomRepository.findById(request.roomId())
                    .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + request.roomId()));
            complaint.setRoom(room);
            roomNumber = room.getRoomNumber();
        }

        var saved = complaintRepository.save(complaint);
        notificationService.notify(
                hostel.getManager(),
                "New Complaint lodged",
                "A new campaign has been lodged by " + author.getName() + "." + roomNumber != null ? " Room number: " + roomNumber : "",
                NotificationType.COMPLAINT_CREATED,
                "COMPLAINT",
                complaint.getId(),
                "/complaints/" + saved.getId());
        log.info("Complaint created: id={}, author={}", saved.getId(), authorId);
        return buildDto(saved, null);
    }

    /**
     * Student deletes their own OPEN complaint (before any manager action).
     *
     * @throws HostelAccessDeniedException if the complaint belongs to someone else
     * @throws IllegalStateException       if the complaint is no longer OPEN
     */
    @Transactional
    public void deleteComplaint(UUID complaintId, UUID authorId) {
        var complaint = requireComplaint(complaintId);
        if (!complaint.getAuthor().getId().equals(authorId)) {
            throw new HostelAccessDeniedException();
        }
        if (complaint.getStatus() != ComplaintStatus.OPEN) {
            throw new IllegalStateException("Cannot delete a complaint that is already being processed.");
        }
        complaintRepository.delete(complaint);
    }

    // -------------------------------------------------------------------------
    // Manager / Admin actions
    // -------------------------------------------------------------------------

    /**
     * Updates complaint status. Notifies the author via the notification service.
     *
     * <p>Allowed transitions enforced here to keep business rules explicit:
     * <ul>
     *   <li>OPEN → IN_PROGRESS, CLOSED</li>
     *   <li>IN_PROGRESS → RESOLVED, CLOSED</li>
     *   <li>RESOLVED → CLOSED</li>
     * </ul>
     */
    @Transactional
    public ComplaintDto updateStatus(UUID complaintId, UpdateComplaintStatusRequest request) {
        var complaint = requireComplaint(complaintId);
        var current   = complaint.getStatus();
        var next      = request.status();

        validateStatusTransition(current, next);

        complaint.setStatus(next);
        if (next == ComplaintStatus.RESOLVED) {
            complaint.setResolvedAt(LocalDateTime.now());
        }

        var saved = complaintRepository.save(complaint);

        // Notify the author
        notificationService.notifyComplaintUpdated(
                saved.getAuthor(), saved.getId(), next.name());

        log.info("Complaint {} status updated: {} → {}", complaintId, current, next);
        return buildDto(saved, null);
    }

    // -------------------------------------------------------------------------
    // Reactions (upvote / downvote)
    // -------------------------------------------------------------------------

    /**
     * Upserts a reaction. Only active residents of the complaint's hostel are allowed to vote.
     *
     * @param complaintId the complaint being voted on
     * @param userId      the voting user
     * @param request     {@code isUpvote = true} for upvote, {@code false} for downvote
     */
    @Transactional
    public ComplaintDto react(UUID complaintId, UUID userId, ReactRequest request) {
        var complaint = requireComplaint(complaintId);
        var user      = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        // 2. Enforce active residency check
        boolean isResident = bookingService.isCurrentResident(userId, complaint);

        if (!isResident) {
            throw new HostelAccessDeniedException("Only actively checked-in residents of this hostel can react to its complaints.");
        }

        // 3. Process reaction toggling
        reactionRepository.findByComplaintIdAndUserId(complaintId, userId)
                .ifPresentOrElse(existing -> {
                    if (existing.getIsUpvote().equals(request.isUpvote())) {
                        reactionRepository.delete(existing);
                    } else {
                        existing.setIsUpvote(request.isUpvote());
                        reactionRepository.save(existing);
                    }
                }, () -> {
                    var reaction = new ComplaintReaction();
                    reaction.setComplaint(complaint);
                    reaction.setUser(user);
                    reaction.setIsUpvote(request.isUpvote());
                    reactionRepository.save(reaction);
                });

        return buildDto(complaint, userId);
    }


    // -------------------------------------------------------------------------
    // Attachments
    // -------------------------------------------------------------------------

    /**
     * Attaches a file URL to a complaint (S3 URL from a prior upload).
     * Only the complaint author can add attachments.
     */
    @Transactional
    public AttachmentDto addAttachment(UUID complaintId, UUID authorId, AddAttachmentRequest request) {
        var complaint = requireComplaint(complaintId);
        if (!complaint.getAuthor().getId().equals(authorId)) {
            throw new HostelAccessDeniedException();
        }

        var attachment = new ComplaintAttachment();
        attachment.setComplaint(complaint);
        attachment.setFileUrl(request.fileUrl());
        attachment.setFileType(request.fileType());

        return complaintMapper.toAttachmentDto(attachmentRepository.save(attachment));
    }

    /** Deletes an attachment. Author or admin/manager only. */
    @Transactional
    public void deleteAttachment(UUID attachmentId, UUID requesterId, boolean isPrivileged) {
        var attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found: " + attachmentId));
        if (!isPrivileged && !attachment.getComplaint().getAuthor().getId().equals(requesterId)) {
            throw new HostelAccessDeniedException();
        }
        attachmentRepository.delete(attachment);
    }

    // -------------------------------------------------------------------------
    // Read operations
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public ComplaintDto getComplaintById(UUID complaintId, UUID requesterId) {
        var complaint = requireComplaint(complaintId);
        return buildDto(complaint, requesterId);
    }

    /** Manager dashboard — complaints for a hostel. */
    @Transactional(readOnly = true)
    public Page<ComplaintSummaryDto> listByHostel(UUID hostelId, String status, Pageable pageable) {
        return complaintRepository.findByHostelId(hostelId, status, pageable)
                .map(this::buildSummaryDto);
    }

    /** Student's own complaints. */
    @Transactional(readOnly = true)
    public Page<ComplaintSummaryDto> myComplaints(UUID authorId, Pageable pageable) {
        return complaintRepository.findByAuthorId(authorId, pageable)
                .map(this::buildSummaryDto);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private Complaint requireComplaint(UUID id) {
        return complaintRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found: " + id));
    }

    private void validateStatusTransition(ComplaintStatus current, ComplaintStatus next) {
        boolean valid = switch (current) {
            case OPEN        -> next == ComplaintStatus.IN_PROGRESS || next == ComplaintStatus.CLOSED;
            case IN_PROGRESS -> next == ComplaintStatus.RESOLVED    || next == ComplaintStatus.CLOSED;
            case RESOLVED    -> next == ComplaintStatus.CLOSED;
            case CLOSED      -> false;
        };
        if (!valid) {
            throw new IllegalStateException(
                    "Invalid complaint status transition: " + current + " → " + next);
        }
    }

    private ComplaintDto buildDto(Complaint complaint, UUID currentUserId) {
        var attachments = attachmentRepository.findByComplaintId(complaint.getId());
        var dto         = complaintMapper.toDto(complaint, complaintMapper.toAttachmentDtos(attachments));
        long up   = reactionRepository.countByComplaintIdAndIsUpvoteTrue(complaint.getId());
        long down = reactionRepository.countByComplaintIdAndIsUpvoteFalse(complaint.getId());

        Boolean myVote = null;
        if (currentUserId != null) {
            myVote = reactionRepository.findByComplaintIdAndUserId(complaint.getId(), currentUserId)
                    .map(ComplaintReaction::getIsUpvote)
                    .orElse(null);
        }

        return new ComplaintDto(
                dto.id(), dto.author(), dto.hostelId(), dto.hostelName(),
                dto.roomId(), dto.roomNumber(), dto.title(), dto.description(),
                dto.status(), dto.category(),
                up, down, up - down, myVote,
                dto.attachments(), dto.createdAt(), dto.updatedAt(), dto.resolvedAt()
        );
    }

    private ComplaintSummaryDto buildSummaryDto(Complaint c) {
        long score = reactionRepository.getNetScore(c.getId());
        int  count = attachmentRepository.findByComplaintId(c.getId()).size();
        return new ComplaintSummaryDto(
                c.getId(),
                c.getAuthor().getName(),
                c.getHostel().getId(), c.getHostel().getName(),
                c.getTitle(), c.getStatus(), c.getCategory(),
                score, count, c.getCreatedAt()
        );
    }
}