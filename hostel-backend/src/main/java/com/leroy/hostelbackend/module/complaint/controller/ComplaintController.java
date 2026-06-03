package com.leroy.hostelbackend.module.complaint.controller;

import com.leroy.hostelbackend.module.complaint.dto.*;
import com.leroy.hostelbackend.module.complaint.service.ComplaintService;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.user.model.UserRole;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Objects;
import java.util.UUID;

/**
 * Complaint CRUD, status management, reactions, and attachments.
 *
 * <pre>
 * POST   /complaints                              STUDENT: raise complaint
 * GET    /complaints/my                           STUDENT: own complaints
 * GET    /complaints/{id}                         Any: detail + vote counts
 * DELETE /complaints/{id}                         STUDENT: delete own OPEN complaint
 * PATCH  /manager/complaints/{id}/status         MANAGER/ADMIN: update status
 * GET    /manager/hostels/{hostelId}/complaints  MANAGER/ADMIN: hostel complaints
 * POST   /complaints/{id}/react                  Any authenticated: vote
 * POST   /complaints/{id}/attachments            STUDENT (author): add attachment
 * DELETE /complaints/attachments/{attachmentId}  Author/MANAGER/ADMIN: remove
 * </pre>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
@Tag(name = "Complaints")
public class ComplaintController {

    private final ComplaintService complaintService;

    @PostMapping("/complaints")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<ComplaintDto>> create(
            @Valid @RequestBody CreateComplaintRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Complaint submitted.", complaintService.createComplaint(customUserDetails.getUserId(), request)));
    }

    @GetMapping("/complaints/my")
    public ResponseEntity<ApiResponse<Page<ComplaintSummaryDto>>> myComplaints(
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success("Complaints fetched.", complaintService.myComplaints(customUserDetails.getUserId(), pageable)));
    }

    @GetMapping("/complaints/{id}")
    public ResponseEntity<ApiResponse<ComplaintDto>> getOne(@PathVariable UUID id, @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        return ResponseEntity.ok(ApiResponse.success("Complaint fetched.", complaintService.getComplaintById(id, customUserDetails.getUserId())));
    }

    @DeleteMapping("/complaints/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id, @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        complaintService.deleteComplaint(id, customUserDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("Complaint deleted."));
    }

    @PatchMapping("/manager/complaints/{id}/status")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ComplaintDto>> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateComplaintStatusRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Status updated.", complaintService.updateStatus(id, request)));
    }

    @GetMapping("/manager/hostels/{hostelId}/complaints")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Page<ComplaintSummaryDto>>> hostelComplaints(
            @PathVariable UUID hostelId,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success("Complaints fetched.",
                complaintService.listByHostel(hostelId, status, pageable)));
    }

    @PostMapping("/complaints/{id}/react")
    public ResponseEntity<ApiResponse<ComplaintDto>> react(
            @PathVariable UUID id,
            @Valid @RequestBody ReactRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success("Reaction recorded.", complaintService.react(id, customUserDetails.getUserId(), request)));
    }

    @PostMapping("/complaints/{id}/attachments")
    public ResponseEntity<ApiResponse<AttachmentDto>> addAttachment(
            @PathVariable UUID id,
            @Valid @RequestBody AddAttachmentRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Attachment added.", complaintService.addAttachment(id, customUserDetails.getUserId(), request)));
    }

    @DeleteMapping("/complaints/attachments/{attachmentId}")
    public ResponseEntity<ApiResponse<Void>> deleteAttachment(
            @PathVariable UUID attachmentId,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        boolean privileged =  Objects.equals(customUserDetails.getRole(), UserRole.MANAGER) || Objects.equals(customUserDetails.getRole(), UserRole.ADMIN);
        complaintService.deleteAttachment(attachmentId, customUserDetails.getUserId(), privileged);
        return ResponseEntity.ok(ApiResponse.success("Attachment removed."));
    }
}