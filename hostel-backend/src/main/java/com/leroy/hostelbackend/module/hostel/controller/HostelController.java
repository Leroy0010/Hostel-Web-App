package com.leroy.hostelbackend.module.hostel.controller;

import com.leroy.hostelbackend.module.hostel.dto.*;
import com.leroy.hostelbackend.module.hostel.service.HostelService;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
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

import java.util.UUID;

/**
 * REST controller for hostel management.
 *
 * <p>Endpoint summary:
 * <pre>
 * GET    /hostels                      → public paginated list (active only)
 * GET    /hostels/{id}                 → public hostel detail
 * POST   /admin/hostels                → ADMIN: create hostel
 * PUT    /admin/hostels/{id}           → ADMIN: update hostel
 * POST   /admin/hostels/{id}/manager   → ADMIN: assign manager
 * DELETE /admin/hostels/{id}/manager   → ADMIN: unassign manager
 * PATCH  /admin/hostels/{id}/deactivate → ADMIN: soft-delete
 * PATCH  /admin/hostels/{id}/activate  → ADMIN: re-activate
 * GET    /admin/hostels                → ADMIN: all hostels (incl. inactive)
 * PUT    /manager/hostels/{id}         → MANAGER: update own hostel
 * GET    /manager/hostels              → MANAGER: their assigned hostels
 * </pre>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Hostels")
@RequestMapping("/api")
public class HostelController {

    private final HostelService hostelService;

    // =========================================================================
    // Public / Student endpoints
    // =========================================================================

    /**
     * Paginated list of active hostels.
     * Default: page 0, size 10, sorted by name ascending.
     */
    @GetMapping("/hostels")
    public ResponseEntity<ApiResponse<Page<HostelSummaryDto>>> listHostels(
            @PageableDefault(sort = "name", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success("Hostels fetched.", hostelService.listActiveHostels(pageable)));
    }

    /** Full hostel detail — any authenticated user. */
    @GetMapping("/hostels/{id}")
    public ResponseEntity<ApiResponse<HostelDto>> getHostel(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Hostel fetched.", hostelService.getHostelById(id)));
    }

    // =========================================================================
    // Admin endpoints
    // =========================================================================

    /** Admin: all hostels including inactive ones. */
    @GetMapping("/admin/hostels")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<HostelSummaryDto>>> adminListAll(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success("All hostels fetched.", hostelService.listAllHostels(pageable)));
    }

    /** Admin: create a new hostel. */
    @PostMapping("/admin/hostels")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<HostelDto>> createHostel(@Valid @RequestBody CreateHostelRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Hostel created successfully.", hostelService.createHostel(request)));
    }

    /** Admin: update hostel fields. Patch semantics — null fields are ignored. */
    @PutMapping("/admin/hostels/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<HostelDto>> updateHostel(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateHostelRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Hostel updated.", hostelService.updateHostel(id, request)));
    }

    /** Admin: assign a manager to a hostel. */
    @PostMapping("/admin/hostels/{id}/manager")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<HostelDto>> assignManager(
            @PathVariable UUID id,
            @Valid @RequestBody AssignManagerRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Manager assigned.", hostelService.assignManager(id, request)));
    }

    /** Admin: remove the manager from a hostel. */
    @DeleteMapping("/admin/hostels/{id}/manager")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<HostelDto>> unassignManager(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Manager unassigned.", hostelService.unassignManager(id)));
    }

    /** Admin: soft-delete (deactivate) a hostel. */
    @PatchMapping("/admin/hostels/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivateHostel(@PathVariable UUID id) {
        hostelService.deactivateHostel(id);
        return ResponseEntity.ok(ApiResponse.success("Hostel deactivated."));
    }

    /** Admin: re-activate a previously deactivated hostel. */
    @PatchMapping("/admin/hostels/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<HostelDto>> activateHostel(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Hostel activated.", hostelService.activateHostel(id)));
    }

    /** Admin: list hostels assigned to a specific manager. */
    @GetMapping("/admin/managers/{managerId}/hostels")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<HostelSummaryDto>>> hostelsByManager(
            @PathVariable UUID managerId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success("Manager hostels fetched.",
                hostelService.listHostelsByManager(managerId, pageable)));
    }

    // =========================================================================
    // Manager endpoints
    // =========================================================================

    /** Manager: list their own assigned hostels. */
    @GetMapping("/manager/hostels")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Page<HostelSummaryDto>>> myHostels(
            @PageableDefault(size = 20, sort = "name") Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var managerId = customUserDetails.getUserId();
        return ResponseEntity.ok(ApiResponse.success("Your hostels fetched.",
                hostelService.listHostelsByManager(managerId, pageable)));
    }

    /** Manager: update their own hostel. */
    @PutMapping("/manager/hostels/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<HostelDto>> managerUpdateHostel(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateHostelRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var managerId = customUserDetails.getUserId();
        return ResponseEntity.ok(ApiResponse.success("Hostel updated.",
                hostelService.managerUpdateHostel(id, request, managerId)));
    }
}