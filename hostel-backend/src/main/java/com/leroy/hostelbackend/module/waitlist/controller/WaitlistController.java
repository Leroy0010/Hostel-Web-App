package com.leroy.hostelbackend.module.waitlist.controller;

import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistDto;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistEntryDto;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistStatusDto;
import com.leroy.hostelbackend.module.waitlist.service.WaitlistService;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
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

import java.util.UUID;

/**
 * REST controller for waitlist operations.
 *
 * <p>Endpoint summary:
 * <pre>
 * POST   /waitlists/{hostelId}           STUDENT: join a hostel's waitlist
 * DELETE /waitlists/{hostelId}           STUDENT: leave a hostel's waitlist
 * GET    /waitlists/{hostelId}/status    STUDENT: check own position
 * GET    /waitlists/my                   STUDENT: all my waitlist entries
 * GET    /manager/hostels/{hostelId}/waitlist   MANAGER/ADMIN: see the queue
 * DELETE /admin/waitlists/{waitlistId}   ADMIN: force-remove an entry
 * </pre>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
@Tag(name = "Waitlists")
public class WaitlistController {

    private final WaitlistService waitlistService;

    // =========================================================================
    // Student endpoints
    // =========================================================================

    /**
     * Join the waitlist for a hostel.
     * Returns 201 Created with the student's position.
     */
    @PostMapping("/waitlists/{hostelId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<WaitlistDto>> joinWaitlist(
            @PathVariable UUID hostelId,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var studentId = customUserDetails.getUserId();
        var entry = waitlistService.joinWaitlist(studentId, hostelId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "You have joined the waitlist at position " + entry.position() + ".", entry));
    }

    /**
     * Leave the waitlist for a hostel.
     */
    @DeleteMapping("/waitlists/{hostelId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Void>> leaveWaitlist(
            @PathVariable UUID hostelId,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var studentId = customUserDetails.getUserId();
        waitlistService.leaveWaitlist(studentId, hostelId);
        return ResponseEntity.ok(ApiResponse.success("You have been removed from the waitlist."));
    }

    /**
     * Check current position on a specific hostel's waitlist.
     */
    @GetMapping("/waitlists/{hostelId}/status")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<WaitlistStatusDto>> getStatus(
            @PathVariable UUID hostelId,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var studentId = customUserDetails.getUserId();
        var status = waitlistService.getWaitlistStatus(studentId, hostelId);
        return ResponseEntity.ok(ApiResponse.success("Waitlist status fetched.", status));
    }

    /**
     * All hostels the authenticated student is currently waiting for.
     */
    @GetMapping("/waitlists/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Page<WaitlistDto>>> myWaitlists(
            @PageableDefault(sort = "joinedAt", direction = Sort.Direction.ASC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var studentId = customUserDetails.getUserId();
        return ResponseEntity.ok(ApiResponse.success("Your waitlist entries fetched.",
                waitlistService.myWaitlistEntries(studentId, pageable)));
    }

    // =========================================================================
    // Manager / Admin endpoints
    // =========================================================================

    /**
     * Full waitlist for a hostel in position order.
     * Used by the manager dashboard to see who is queued.
     */
    @GetMapping("/manager/hostels/{hostelId}/waitlist")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Page<WaitlistEntryDto>>> hostelWaitlist(
            @PathVariable UUID hostelId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success("Waitlist fetched.",
                waitlistService.hostelWaitlist(hostelId, pageable)));
    }

    /**
     * Admin force-removes a specific waitlist entry (data correction / misconduct).
     */
    @DeleteMapping("/admin/waitlists/{waitlistId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> adminRemove(@PathVariable UUID waitlistId) {
        waitlistService.adminRemoveEntry(waitlistId);
        return ResponseEntity.ok(ApiResponse.success("Waitlist entry removed."));
    }
}