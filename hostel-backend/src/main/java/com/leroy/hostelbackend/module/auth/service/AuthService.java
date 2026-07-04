package com.leroy.hostelbackend.module.auth.service;

import com.leroy.hostelbackend.config.JwtConfig;
import com.leroy.hostelbackend.module.auth.dto.*;
import com.leroy.hostelbackend.module.auth.model.AuthToken;
import com.leroy.hostelbackend.module.auth.model.AuthTokenType;
import com.leroy.hostelbackend.module.auth.repository.AuthTokenRepository;
import com.leroy.hostelbackend.module.email.service.EmailService;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.exception.TokenExpiredException;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final AuthTokenRepository authTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();
    private final EmailService emailService;
    private final JwtConfig jwtConfig;

    public CustomUserDetails getAuthenticatedUserDetails() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails details)) {
            throw new IllegalStateException("No authenticated user found in the current security context.");
        }
        return details;
    }

    /** Fixed bug: Safely extract the UUID from our CustomUserDetails wrapper principal */
    public User getAuthenticatedUser() {
        UUID userId = getAuthenticatedUserDetails().getUserId();
        return userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Authenticated user no longer exists: " + userId));
    }

    // -------------------------------------------------------------------------
    // 1. Email Verification Flow
    // -------------------------------------------------------------------------

    @Transactional
    public String createEmailVerificationToken(User user) {
        // Enforce account initialization policy: user starts inactive until verified
        user.setIsActive(false);
        userRepository.save(user);

        return generateAndSaveToken(user, AuthTokenType.EMAIL_VERIFICATION, 24 * 60); // 24-hour window
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        String hash = hashToken(rawToken);
        AuthToken tokenEntity = authTokenRepository.findByTokenHashAndType(hash, AuthTokenType.EMAIL_VERIFICATION)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or non-existent verification token."));

        if (tokenEntity.isExpired()) {
            authTokenRepository.delete(tokenEntity);
            throw new TokenExpiredException("Verification token has expired. Please register again.");
        }

        User user = tokenEntity.getUser();
        user.setIsActive(true);
        userRepository.save(user);

        authTokenRepository.delete(tokenEntity); // Single-use guarantee
        log.info("Email verified successfully for user ID: {}", user.getId());
    }

    @Transactional
    public void resendVerificationEmail(ResendVerificationRequest request) {
        // Security: Prevent email enumeration by failing silently if the user doesn't exist
        var userOpt = userRepository.findByEmailIgnoreCase(request.email().trim());
        if (userOpt.isEmpty()) {
            log.info("Resend verification requested for non-existent email: {}", request.email());
            return;
        }

        User user = userOpt.get();

        // Security: Prevent sending tokens to already active accounts
        if (user.getIsActive()) {
            log.info("Resend verification requested for already active user ID: {}", user.getId());
            return;
        }

        // Generate a new 24-hour token (this automatically drops the old one via generateAndSaveToken)
        String rawToken = generateAndSaveToken(user, AuthTokenType.EMAIL_VERIFICATION, 24 * 60);

        // Ensure you have this corresponding method in your EmailService
        emailService.sendStudentVerificationEmail(user.getEmail(), user.getName(), rawToken);

        log.info("New verification email sent securely for user ID: {}", user.getId());
    }

    // -------------------------------------------------------------------------
    // 2. Authenticated Password Modification
    // -------------------------------------------------------------------------

    @Transactional
    public void changePassword(PasswordChangeRequest request) {
        User user = getAuthenticatedUser();

        // Security Guard: Defend against session-hijack password changes
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BadCredentialsException("The current password provided is incorrect.");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        log.info("Password changed securely via user settings for ID: {}", user.getId());
    }

    // -------------------------------------------------------------------------
    // 3. Lost Password Recovery Flow
    // -------------------------------------------------------------------------

    @Transactional
    public void initiatePasswordReset(PasswordResetRequest request) {
        // Use standard data leak mitigation layout for production security:
        // Do not throw a 404 if email isn't found. This prevents scanning accounts.
        var userOpt = userRepository.findByEmailIgnoreCase(request.email().trim());
        if (userOpt.isEmpty()) {
            log.info("Password reset requested for non-existent email: {}", request.email());
            return;
        }

        User user = userOpt.get();
        String rawToken = generateAndSaveToken(user, AuthTokenType.PASSWORD_RESET, 15);
        emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), rawToken);

        log.info("Password reset token generated and emailed safely for user ID: {}", user.getId());
    }

    @Transactional
    public void completePasswordReset(PasswordResetConfirmRequest request) {
        String hash = hashToken(request.token());
        AuthToken tokenEntity = authTokenRepository.findByTokenHashAndType(hash, AuthTokenType.PASSWORD_RESET)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token."));

        if (tokenEntity.isExpired()) {
            authTokenRepository.delete(tokenEntity);
            throw new IllegalStateException("Your password reset link has expired.");
        }

        User user = tokenEntity.getUser();
        user.setPassword(passwordEncoder.encode(request.newPassword()));

        if(request.type() != null && request.type().equals("activation")){
            user.setIsActive(true);
        }
        userRepository.save(user);

        // Wipe all reset footprints for this specific profile
        authTokenRepository.deleteByUserIdAndType(user.getId(), AuthTokenType.PASSWORD_RESET);
        log.info("Password has been successfully recovered and reset for user ID: {}", user.getId());
    }

    public void setAuthCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(jwtConfig.isCookieSecure())
                .path("/")
                .maxAge(jwtConfig.getRefreshTokenExpiration())
                .sameSite(jwtConfig.getCookieSameSite())
                .domain(jwtConfig.getCookieDomain())
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /**
     * Expires the {@code refreshToken} cookie on the client.
     *
     * <p><strong>Critical:</strong> a cookie is identified by the tuple
     * (name, domain, path). To actually delete a cookie you must re-issue it
     * with the exact same {@code path}/{@code secure}/{@code sameSite} attributes
     * it was originally set with and {@code maxAge(0)} — otherwise the browser
     * silently creates a second, separate cookie and the original one (still
     * holding a live session) is left completely untouched.
     *
     * <p>This is the single source of truth for clearing the cookie; both
     * {@code /auth/logout} and the {@code /auth/refresh} failure path must call
     * this instead of hand-rolling their own {@link ResponseCookie} (previously
     * they used mismatched paths and a hardcoded {@code "localhost"} domain,
     * which meant logging out never actually cleared the cookie in production).
     */
    public void clearAuthCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(jwtConfig.isCookieSecure())
                .path("/") // Must match setAuthCookie()
                .maxAge(0)
                .sameSite(jwtConfig.getCookieSameSite())
                .domain(jwtConfig.getCookieDomain())
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }


    // -------------------------------------------------------------------------
    // Cryto Token Engine Helpers
    // -------------------------------------------------------------------------

    public String generateAndSaveToken(User user, AuthTokenType type, long expiryInMinutes) {
        // Clear previous matching records out of the stack
        authTokenRepository.deleteByUserIdAndType(user.getId(), type);

        // Generate a cryptographically strong unguessable value
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String rawToken = HexFormat.of().formatHex(bytes);

        AuthToken tokenEntity = new AuthToken();
        tokenEntity.setUser(user);
        tokenEntity.setTokenHash(hashToken(rawToken));
        tokenEntity.setType(type);
        tokenEntity.setExpiresAt(LocalDateTime.now().plusMinutes(expiryInMinutes));

        authTokenRepository.save(tokenEntity);
        return rawToken;
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm missing from core environment.", e);
        }
    }
}