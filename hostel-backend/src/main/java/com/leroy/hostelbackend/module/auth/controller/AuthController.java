package com.leroy.hostelbackend.module.auth.controller;

import com.leroy.hostelbackend.config.JwtConfig;
import com.leroy.hostelbackend.module.auth.dto.LoginRequest;
import com.leroy.hostelbackend.module.auth.security.JwtResponse;
import com.leroy.hostelbackend.module.auth.security.JwtService;
import com.leroy.hostelbackend.module.auth.service.AuthService;
import com.leroy.hostelbackend.module.user.dto.UserDto;
import com.leroy.hostelbackend.module.user.mapper.UserMapper;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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
    private final UserMapper userMapper;
    private final JwtConfig jwtConfig;
    private final AuthService authService;

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
    public ResponseEntity<JwtResponse> login(
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
        var cookie = new Cookie("refreshToken", refreshToken.toString());
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/auth/refresh");   // scoped: only sent to the refresh endpoint
        cookie.setMaxAge(jwtConfig.getRefreshTokenExpiration());
        response.addCookie(cookie);

        return ResponseEntity.ok(new JwtResponse(accessToken.toString()));
    }

    /**
     * Returns the profile of the currently authenticated user.
     *
     * <p>The principal in the security context is a {@link CustomUserDetails} instance
     * (set by {@link com.leroy.hostelbackend.module.auth.security.JwtAuthenticationFilter}).
     * We retrieve the user ID from it and fetch the entity — this is the only place a
     * database query is needed for {@code /me}. All other endpoints that only need the ID
     * or role should call {@link AuthService#getAuthenticatedUserDetails()} instead.
     *
     * @return the current user's {@link UserDto}
     */
    @GetMapping("/me")
    public ResponseEntity<UserDto> me() {
        var user = authService.getAuthenticatedUser();
        return ResponseEntity.ok(userMapper.toDto(user));
    }

    /**
     * Issues a new access token using the refresh token stored in the cookie.
     *
     * @param refreshToken extracted automatically from the {@code refreshToken} cookie
     * @return a new access token, or {@code 401} if the refresh token is expired/invalid
     */
    @PostMapping("/refresh")
    public ResponseEntity<JwtResponse> refreshToken(
            @CookieValue(value = "refreshToken") String refreshToken
    ) {
        var jwt = jwtService.parseToken(refreshToken);
        if (jwt == null || jwt.isExpired()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        var user = userRepository.findById(jwt.getUserId()).orElseThrow();
        var accessToken = jwtService.generateAccessToken(user);

        return ResponseEntity.ok(new JwtResponse(accessToken.toString()));
    }

    // -------------------------------------------------------------------------
    // Local exception handlers (controller-scoped overrides)
    // -------------------------------------------------------------------------

    /**
     * Handles wrong email / password combinations.
     *
     * <p>This is intentionally vague — we do not tell the caller whether the email
     * or the password was wrong, to prevent user-enumeration attacks.
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleBadCredentials() {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Invalid credentials."));
    }
}