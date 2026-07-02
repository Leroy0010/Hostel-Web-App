package com.leroy.hostelbackend.module.user.controller;

import com.leroy.hostelbackend.module.user.dto.*;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.user.service.UserService;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<ApiResponse<Void>> registerStudent(@Valid @RequestBody CreateStudentRequest request, HttpServletResponse response) {
        userService.registerStudent(request, response);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        ApiResponse
                        .success(
                        "User registered successfully! Check your mailbox and verify your email to be able to login."));
    }


    /**
     * Returns the profile of the currently authenticated user.
     *
     * <p>The principal in the security context is a {@link CustomUserDetails} instance
     * (set by {@link com.leroy.hostelbackend.module.auth.security.JwtAuthenticationFilter}).<p>
     * We retrieve the user ID from it and fetch the entity — this is the only place a
     * database query is needed for {@code /me}.
     * @return the current user's {@link UserDto}
     */
    @GetMapping("/users/me")
    public ResponseEntity<ApiResponse<UserResponse>> getUserProfile(@AuthenticationPrincipal CustomUserDetails customUserDetails){
        return ResponseEntity.ok(ApiResponse.success("Profile fetched", userService.me(customUserDetails.getUserId())));
    }

    @PutMapping("/users/me")
    public ResponseEntity<ApiResponse<Void>> updateUserProfile(@AuthenticationPrincipal CustomUserDetails user, @Valid @RequestBody UpdateProfileRequest request) {
        userService.updateProfile(user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile update successfully"));
    }


    @PatchMapping("/users/me/profile-url")
    public ResponseEntity<ApiResponse<Void>> updateUserProfileUrl(@AuthenticationPrincipal CustomUserDetails user, @Valid @RequestBody UpdateProfileUrlRequest request) {
        userService.updateProfileUrl( request.getProfileUrl(), user.getUserId());
        return ResponseEntity.ok(ApiResponse.success("Profile update successfully"));
    }

    @GetMapping("/users/managers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserSummary>>> getManagers(){
        return ResponseEntity.ok(ApiResponse.success("Managers fetched", userService.getManagers()));
    }
}