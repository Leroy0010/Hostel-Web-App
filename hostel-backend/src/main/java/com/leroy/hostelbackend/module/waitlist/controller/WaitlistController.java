package com.leroy.hostelbackend.module.waitlist.controller;

import com.leroy.hostelbackend.module.booking.dto.AvailablePeriodDto;
import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.waitlist.dto.JoinWaitlistRequest;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistDto;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistEntryDto;
import com.leroy.hostelbackend.module.waitlist.dto.WaitlistStatusDto;
import com.leroy.hostelbackend.module.waitlist.service.WaitlistService;
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

import java.util.List;
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
 * GET    /manager/hostels/{hostelId}/waitlist   MANAGER: see the queue
 * DELETE /manager/waitlists/{waitlistId}   MANAGER: force-remove an entry
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
    @PostMapping("/waitlists")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<WaitlistDto>> joinWaitlist(
            @Valid @RequestBody JoinWaitlistRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var studentId = customUserDetails.getUserId();
        var entry = waitlistService.joinWaitlist(studentId, request);
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
            @Valid @RequestBody JoinWaitlistRequest request,
            @PathVariable UUID hostelId,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var studentId = customUserDetails.getUserId();
        waitlistService.leaveWaitlist(studentId, hostelId,request.roomType(),  request.academicYear(),  request.semester());
        return ResponseEntity.ok(ApiResponse.success("You have been removed from the waitlist."));
    }

    /**
     * Check current position on a specific hostel's waitlist.
     */
    @GetMapping("/waitlists/status/{hostelId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<WaitlistStatusDto>> getStatus(
            @PathVariable UUID hostelId,
            @RequestParam(required = false) RoomType roomType,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String academicYear,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var studentId = customUserDetails.getUserId();
        var status = waitlistService.getWaitlistStatus(studentId, hostelId,roomType,  academicYear, semester);
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
    // Manager endpoints
    // =========================================================================

    /**
     * Full waitlist for a hostel in position order.
     * Used by the manager dashboard to see who is queued.
     */
    @GetMapping("/manager/hostels/{hostelId}/waitlist")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Page<WaitlistEntryDto>>> hostelWaitlist(
            @PathVariable UUID hostelId,
            @RequestParam(required = false) RoomType roomType,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String academicYear,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success("Waitlist fetched.",
                waitlistService.hostelWaitlist(hostelId, roomType, academicYear, semester, pageable)));
    }

    /**
     * Manager force-removes a specific waitlist entry (data correction / misconduct).
     */
    @DeleteMapping("/manager/waitlists/{waitlistId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Void>> managerRemove(@PathVariable UUID waitlistId) {
        waitlistService.managerRemoveEntry(waitlistId);
        return ResponseEntity.ok(ApiResponse.success("Waitlist entry removed."));
    }

    @GetMapping("hostels/{hostelId}/waitlist-periods")
    public ResponseEntity<ApiResponse<List<AvailablePeriodDto>>> getWaitlistPeriods(
            @PathVariable UUID hostelId,
            @RequestParam(required = false) RoomType roomType) {

        List<AvailablePeriodDto> periods = waitlistService.getWaitlistPeriodsDropdown(hostelId, roomType);
        return ResponseEntity.ok(ApiResponse.success("Waitlist periods fetched.", periods));
    }
}