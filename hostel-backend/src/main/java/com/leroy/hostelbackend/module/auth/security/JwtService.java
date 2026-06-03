package com.leroy.hostelbackend.module.auth.security;

import com.leroy.hostelbackend.config.JwtConfig;
import com.leroy.hostelbackend.module.user.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.Map;

/**
 * Handles JWT generation and parsing.
 *
 * <p>Both access and refresh tokens include a small set of claims:
 * <ul>
 *   <li>{@code sub}   — the user's UUID (used to reload the entity on each request)</li>
 *   <li>{@code email} — for display / debugging in the frontend</li>
 *   <li>{@code name}  — display name</li>
 *   <li>{@code role}  — the user's role string (e.g. "ADMIN")</li>
 * </ul>
 *
 * <p>Sensitive fields (password hash, FCM token) are never included in JWT claims.
 */
@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtConfig jwtConfig;

    /**
     * Generates a short-lived access token for the given user.
     *
     * @param user the authenticated user entity
     * @return a signed {@link Jwt} ready to be serialised with {@code toString()}
     */
    public Jwt generateAccessToken(User user) {
        return generateToken(user, jwtConfig.getTokenExpiration());
    }

    /**
     * Generates a long-lived refresh token for the given user.
     * Stored as an {@code HttpOnly} cookie — never returned in a response body.
     *
     * @param user the authenticated user entity
     * @return a signed {@link Jwt}
     */
    public Jwt generateRefreshToken(User user) {
        return generateToken(user, jwtConfig.getRefreshTokenExpiration());
    }

    /**
     * Parses a raw JWT string and returns a {@link Jwt} wrapper, or {@code null} if
     * the token is structurally invalid (bad signature, malformed, etc.).
     * Expiry is checked separately via {@link Jwt#isExpired()}.
     *
     * @param token the raw JWT string
     * @return parsed {@link Jwt}, or {@code null} on parse failure
     */
    public Jwt parseToken(String token) {
        try {
            var claims = getClaims(token);
            return new Jwt(claims, jwtConfig.getSecretKey());
        } catch (JwtException e) {
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Jwt generateToken(User user, long expirationSeconds) {
        var claims = Jwts.claims()
                .subject(user.getId().toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 1000L * expirationSeconds))
                .add(Map.of(
                        "email", user.getEmail(),
                        "name",  user.getName(),
                        "role",  user.getRole().name()
                ))
                .build();

        return new Jwt(claims, jwtConfig.getSecretKey());
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(jwtConfig.getSecretKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}