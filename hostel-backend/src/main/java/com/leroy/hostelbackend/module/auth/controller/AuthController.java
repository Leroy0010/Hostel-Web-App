package com.leroy.hostelbackend.module.auth.controller;

import com.leroy.hostelbackend.config.JwtConfig;
import com.leroy.hostelbackend.module.auth.dto.*;
import com.leroy.hostelbackend.module.auth.mapper.AuthMapper;
import com.leroy.hostelbackend.module.auth.security.JwtService;
import com.leroy.hostelbackend.module.auth.service.AuthService;
import com.leroy.hostelbackend.module.user.mapper.UserMapper;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication endpoints: login, token refresh, and current-user profile.
 *
 * <p>Access token is returned in the response body.
 * Refresh token is set as an {@code HttpOnly} cookie so it is never accessible
 * to JavaScript and cannot be stolen via XSS.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
@Tag(name = "Auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final JwtConfig jwtConfig;
    private final AuthService authService;
    private final AuthMapper authMapper;
    private final UserMapper userMapper;

    /**
     * Authenticates the user and issues an access token + refresh token cookie.
     *
     * <p>{@code @Valid} ensures that mistyped field names (e.g. {@code "emal"} instead
     * of {@code "email"}) are caught by Bean Validation <em>before</em> the
     * {@link AuthenticationManager} is called, returning a descriptive {@code 400}
     * rather than a misleading {@code 401 Invalid credentials}.
     *
     * @param request  validated login credentials
     * @param response used to attach the {@code refreshToken} HttpOnly cookie
     * @return access token in the body
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        // Delegates to CustomUserDetailsService → BCrypt compare.
        // Throws BadCredentialsException if credentials are wrong (handled below).
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        // Safe to call orElseThrow here — we just authenticated successfully above,
        // so the user definitely exists.
        var user = userRepository.findByEmailIgnoreCase(request.getEmail()).orElseThrow();

        var accessToken  = jwtService.generateAccessToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);

        // HttpOnly + Secure cookie — never readable by JavaScript
        authService.setAuthCookie(response, refreshToken.toString());

        var userResponse = userMapper.toResponse(user, null);

        return ResponseEntity.ok(ApiResponse.success("Login successful!", authMapper.toLoginResponse(userResponse, accessToken.toString())));
    }

    /**
     * Issues a new access token using the refresh token stored in the cookie.
     *
     * @param refreshToken extracted automatically from the {@code refreshToken} cookie
     * @return a new access token, or {@code 401} if the refresh token is expired/invalid
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(
            @CookieValue(value = "refreshToken", required = false)
            String refreshToken,
            HttpServletResponse response
    ) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Refresh token is missing."));
        }

        var jwt = jwtService.parseToken(refreshToken);

        if (jwt == null || jwt.isExpired()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Refresh token is invalid or expired."));
        }

        var user = userRepository.findById(jwt.getUserId()).orElseThrow();

        if (Boolean.FALSE.equals(user.getIsActive())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        var accessToken = jwtService.generateAccessToken(user);
        var newRefreshToken = jwtService.generateRefreshToken(user);

        // HttpOnly + Secure cookie — never readable by JavaScript
        authService.setAuthCookie(response, newRefreshToken.toString());
        var userResponse = userMapper.toResponse(user, null);

        return ResponseEntity.ok(ApiResponse.success("Token refresh successful", authMapper.toLoginResponse(userResponse, accessToken.toString())));

    }

    // -------------------------------------------------------------------------
    // Registration Email Verification
    // -------------------------------------------------------------------------

    @GetMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(ApiResponse.success("Email verification successful! Your account is now active."));
    }

    // -------------------------------------------------------------------------
    // Authenticated Password Operations
    // -------------------------------------------------------------------------

    @PostMapping("/password-change")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody PasswordChangeRequest request
    ) {
        authService.changePassword(request);
        return ResponseEntity.ok(ApiResponse.success("Your password has been changed successfully."));
    }

    // -------------------------------------------------------------------------
    // Anonymous Password Recovery Engine
    // -------------------------------------------------------------------------

    @PostMapping("/password-reset/request")
    public ResponseEntity<ApiResponse<Void>> requestReset(
            @Valid @RequestBody PasswordResetRequest request
    ) {
        authService.initiatePasswordReset(request);
        // Always return a success message, even if the email doesn't exist
        return ResponseEntity.ok(ApiResponse.success("If the email is registered, a password reset link has been dispatched."));
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmReset(
            @Valid @RequestBody PasswordResetConfirmRequest request
    ) {
        authService.completePasswordReset(request);
        return ResponseEntity.ok(ApiResponse.success("Your password has been set successfully. You can now log in."));
    }

    /**
     * Logs out the user by clearing the refresh token cookie.
     *
     * @param response used to overwrite and clear the {@code refreshToken} cookie
     * @return success message
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse response) {
        // Create a cookie with the exact same name, path, and domain
        var cookie = new Cookie("refreshToken", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Match your login configuration
        cookie.setPath("/api/auth/refresh"); // Must match the original path exactly
        cookie.setDomain("localhost"); // Must match the original domain exactly

        // Setting maxAge to 0 tells the browser to delete the cookie immediately
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", "LAX");

        response.addCookie(cookie);

        return ResponseEntity.ok(ApiResponse.success("Logout successful!"));
    }


}