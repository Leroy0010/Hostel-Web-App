package com.leroy.hostelbackend.module.auth.service;

import com.leroy.hostelbackend.config.JwtConfig;
import com.leroy.hostelbackend.module.auth.model.RefreshToken;
import com.leroy.hostelbackend.module.auth.repository.RefreshTokenRepository;
import com.leroy.hostelbackend.module.user.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtConfig jwtConfig;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Creates and persists a cryptographically secure, unguessable refresh token.
     */
    @Transactional
    public RefreshToken createRefreshToken(User user) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String tokenStr = HexFormat.of().formatHex(bytes);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(tokenStr);
        refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(jwtConfig.getRefreshTokenExpiration()));
        refreshToken.setIsRevoked(false);

        return refreshTokenRepository.save(refreshToken);
    }

    /**
     * Validates an incoming refresh token string and rotates it.
     * Enforces automatic token reuse detection (breach mitigation).
     */
    @Transactional
    public RefreshToken rotateRefreshToken(String rawToken) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(rawToken)
                .orElseThrow(() -> new IllegalArgumentException("Refresh token does not exist."));

        // Breach Detection: If token is already revoked, an attacker or compromised user is reusing it.
        if (Boolean.TRUE.equals(refreshToken.getIsRevoked())) {
            refreshTokenRepository.deleteByUser(refreshToken.getUser());
            log.warn("CRITICAL SECURITY ALERT: Revoked refresh token reuse detected for User ID: {}. All active sessions invalidated.",
                    refreshToken.getUser().getId());
            throw new SecurityException("Session anomaly detected. Please re-authenticate.");
        }

        // Expiration Verification
        if (refreshToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(refreshToken);
            throw new IllegalStateException("Refresh token has expired.");
        }

        // Soft-revoke the current token instead of deleting it immediately (tracks token reuse attempts)
        refreshToken.setIsRevoked(true);
        refreshTokenRepository.save(refreshToken);

        // Issue fresh token link in the chain
        return createRefreshToken(refreshToken.getUser());
    }

    /**
     * Deletes token records associated with a targeted logout event.
     */
    @Transactional
    public void revokeToken(String rawToken) {
        refreshTokenRepository.findByToken(rawToken).ifPresent(refreshTokenRepository::delete);
    }

    /**
     * Automatic Housekeeping: Runs daily at midnight to keep the database table clean.
     */
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void cleanExpiredTokens() {
        log.info("Starting scheduled cleanup of expired or revoked database refresh tokens...");
        refreshTokenRepository.deleteAllExpiredOrRevoked(LocalDateTime.now());
    }
}