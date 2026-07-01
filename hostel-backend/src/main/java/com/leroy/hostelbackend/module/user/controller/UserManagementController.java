package com.leroy.hostelbackend.module.user.controller;

import com.leroy.hostelbackend.module.user.dto.*;
import com.leroy.hostelbackend.module.user.model.UserRole;
import com.leroy.hostelbackend.module.user.service.UserManagementService;
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
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Admin-only REST controller for user account management.
 *
 * <p>Endpoint summary:
 * <pre>
 * GET    /admin/users                    → paginated user list (all roles, filterable)
 * POST   /admin/users                    → create MANAGER or ADMIN account
 * PATCH  /admin/users/{id}/deactivate    → soft-deactivate a user
 * PATCH  /admin/users/{id}/activate      → re-activate a user
 * </pre>
 *
 * <p>All endpoints require {@code ROLE_ADMIN}. The existing student
 * self-registration endpoint ({@code POST /api/users}) is in
 * {@link UserController} and remains open.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "User Management")
public class UserManagementController {

    private final UserManagementService userManagementService;

    /**
     * Paginated, filterable list of all users.
     *
     * <p>Supports filtering by role and a full-text search on name and email
     * via query params. Default sort is newest accounts first.
     *
     * @param role   optional role filter: ADMIN | MANAGER | STUDENT
     * @param search optional text search (name or email, case-insensitive)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserDto>>> listUsers(
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isActive,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Users fetched.",
                userManagementService.listUsers(role, search, isActive, pageable)));
    }

    /**
     * Creates a new MANAGER or ADMIN staff account.
     *
     * <p>An activation email is sent so the staff member can set their password.
     * Attempting to create a STUDENT account via this endpoint is rejected —
     * students self-register at {@code POST /api/users}.
     *
     * @param request validated staff creation payload
     */
    @PostMapping
    public ResponseEntity<ApiResponse<UserDto>> createStaff(
            @Valid @RequestBody CreateStaffRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        request.getRole() + " account created successfully.",
                        userManagementService.createStaff(request)));
    }

    /**
     * Soft-deactivates a user account.
     *
     * <p>The user can no longer log in but their data is preserved.
     * An admin cannot deactivate their own account.
     *
     * @param id UUID of the user to deactivate
     */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<UserDto>> deactivateUser(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(
                "User deactivated.",
                userManagementService.deactivateUser(id)));
    }

    /**
     * Re-activates a previously deactivated user account.
     *
     * @param id UUID of the user to re-activate
     */
    @PatchMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<UserDto>> activateUser(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(
                "User activated.",
                userManagementService.activateUser(id)));
    }
}