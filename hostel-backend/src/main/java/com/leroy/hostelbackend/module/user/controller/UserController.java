package com.leroy.hostelbackend.module.user.controller;

import com.leroy.hostelbackend.module.user.dto.CreateStaffRequest;
import com.leroy.hostelbackend.module.user.dto.CreateStudentRequest;
import com.leroy.hostelbackend.module.user.dto.UserDto;
import com.leroy.hostelbackend.module.user.dto.UserResponse;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.user.service.UserService;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for user account creation.
 *
 * <p>Two endpoints:
 * <ul>
 *   <li>{@code POST /api/users}        — open; students self-register.</li>
 *   <li>{@code POST /api/users/admin}  — secured; ADMIN creates MANAGER or ADMIN accounts.</li>
 * </ul>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
@Tag(name = "Users")
public class UserController {

    private final UserService userService;

    /**
     * Student self-registration. Publicly accessible — no authentication required.
     *
     * <p>{@code @Valid} triggers Spring's constraint validation on {@link CreateStudentRequest}
     * <em>before</em> the method body executes. A failed constraint fires
     * {@link org.springframework.web.bind.MethodArgumentNotValidException}, which is
     * caught by {@link com.leroy.hostelbackend.shared.exception.GlobalExceptionHandler}
     * and returned as a structured {@code 400 Bad Request} with per-field messages.
     *
     * @param request validated student registration payload
     * @return {@code 201 Created} with the new {@link UserDto}
     */
    @PostMapping("/users")
    public ResponseEntity<UserDto> registerStudent(@Valid @RequestBody CreateStudentRequest request) {
        var created = userService.registerStudent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Admin-only staff account creation.
     *
     * <p>{@code @PreAuthorize("hasRole('ADMIN')")} is evaluated by Spring Security
     * <em>before</em> the method runs. Any non-ADMIN caller receives a
     * {@code 403 Forbidden} via the global exception handler.
     *
     * @param request validated staff creation payload (phone required, role must be MANAGER or ADMIN)
     * @return {@code 201 Created} with the new {@link UserDto}
     */
    @PostMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDto> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        var created = userService.createStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/users/me")
    public ResponseEntity<ApiResponse<UserResponse>> getUserProfile(@AuthenticationPrincipal CustomUserDetails customUserDetails){
        return ResponseEntity.ok(ApiResponse.success("Profile fetched", userService.me(customUserDetails.getUserId())));
    }
}