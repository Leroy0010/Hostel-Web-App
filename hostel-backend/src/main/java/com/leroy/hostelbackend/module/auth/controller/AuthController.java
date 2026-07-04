package com.leroy.hostelbackend.module.auth.controller;

import com.leroy.hostelbackend.module.auth.dto.*;
import com.leroy.hostelbackend.module.auth.mapper.AuthMapper;
import com.leroy.hostelbackend.module.auth.security.JwtService;
import com.leroy.hostelbackend.module.auth.service.AuthService;
import com.leroy.hostelbackend.module.auth.service.RefreshTokenService;
import com.leroy.hostelbackend.module.user.mapper.UserMapper;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final AuthMapper authMapper;
    private final UserMapper userMapper;
    private final RefreshTokenService refreshTokenService;

    /**
     *  Authenticates the user and issues an access token + database-backed refresh token.
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
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        var user = userRepository.findByEmailIgnoreCase(request.getEmail()).orElseThrow();

        var accessToken  = jwtService.generateAccessToken(user);
        // Persist and generate secure opaque DB token
        var refreshToken = refreshTokenService.createRefreshToken(user);

        // Attach token string directly to cookie
        authService.setAuthCookie(response, refreshToken.getToken());

        var userResponse = userMapper.toResponse(user, null);
        return ResponseEntity.ok(ApiResponse.success("Login successful!", authMapper.toLoginResponse(userResponse, accessToken.toString())));
    }

    /**
     * Rotates both the access token and the database refresh token entry via RTR policies.
     *
     * @param refreshToken extracted automatically from the {@code refreshToken} cookie
     * @return a new access token, or {@code 401} if the refresh token is expired/invalid
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(
            @CookieValue(value = "refreshToken", required = false) String refreshToken,
            HttpServletResponse response
    ) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Refresh token is missing."));
        }

        try {
            // 1. Rotate token state inside the service layer transaction context
            var rotatedTokenEntity = refreshTokenService.rotateRefreshToken(refreshToken);

            // 2. SAFE FETCH: Avoid LazyInitializationException by pulling a clean,
            // fully-hydrated User entity using the proxy's ID.
            var user = userRepository.findById(rotatedTokenEntity.getUser().getId())
                    .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException(
                            "User associated with this token no longer exists."));

            // 3. Evaluate state on the freshly queried entity
            if (Boolean.FALSE.equals(user.getIsActive())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            var newAccessToken = jwtService.generateAccessToken(user);

            // 4. Safely commit cookie updates to the client
            authService.setAuthCookie(response, rotatedTokenEntity.getToken());

            var userResponse = userMapper.toResponse(user, null);
            return ResponseEntity.ok(ApiResponse.success("Token refresh successful", authMapper.toLoginResponse(userResponse, newAccessToken.toString())));

        } catch (RuntimeException e) {
            log.error("Token verification failure: {}", e.getMessage());

            // Wipe the bad/compromised cookie using the SAME attributes it was
            // set with (see AuthService.clearAuthCookie) — a hardcoded "localhost"
            // domain and a mismatched path here meant this never actually cleared
            // the cookie in production.
            authService.clearAuthCookie(response);

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
    // -------------------------------------------------------------------------
    // Registration Email Verification
    // -------------------------------------------------------------------------

    @GetMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(ApiResponse.success("Email verification successful! Your account is now active."));
    }

    @PostMapping("/verify-email/resend")
    public ResponseEntity<ApiResponse<Void>> resendVerificationToken(@Valid @RequestBody ResendVerificationRequest request){
        authService.resendVerificationEmail(request);
        return ResponseEntity.ok(ApiResponse.success("Verification email has been sent."));
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
     * Explicitly destroys session context upon logout requests.
     *
     * @param response used to overwrite and clear the {@code refreshToken} cookie
     * @return success message
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(value = "refreshToken", required = false) String refreshToken,
            HttpServletResponse response
    ) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenService.revokeToken(refreshToken);
        }

        // Was previously hand-rolled with secure(false)/path("/api/auth/refresh"),
        // which never matched the cookie set at login (secure=config, path="/"),
        // so logout looked successful but silently left the real session cookie
        // alive in the browser. Now uses the single shared helper.
        authService.clearAuthCookie(response);

        return ResponseEntity.ok(ApiResponse.success("Logout successful!"));
    }

}