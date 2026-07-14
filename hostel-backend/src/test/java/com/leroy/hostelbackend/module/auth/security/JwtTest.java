package com.leroy.hostelbackend.module.auth.security;

import com.leroy.hostelbackend.module.user.model.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link Jwt}.
 *
 * <p>Built with real {@code io.jsonwebtoken} claims/keys rather than mocks —
 * {@link Jwt} is a thin wrapper over that library's types, so exercising it
 * with the real objects is both simpler and more representative than
 * mocking {@link Claims}.
 */
class JwtTest {

    private static final SecretKey SECRET_KEY =
            Keys.hmacShaKeyFor("test-secret-key-at-least-32-bytes-long!".getBytes());

    private static Claims claimsExpiringAt(Date expiration) {
        return Jwts.claims()
                .subject(UUID.randomUUID().toString())
                .issuedAt(new Date())
                .expiration(expiration)
                .add(Map.of("email", "lexa.doe@ucc.edu.gh", "name", "Lexa Doe", "role", "STUDENT"))
                .build();
    }

    @Test
    @DisplayName("isExpired() is false for a token whose expiration is in the future")
    void isExpiredFalseForFutureExpiration() {
        var jwt = new Jwt(claimsExpiringAt(new Date(System.currentTimeMillis() + 60_000)), SECRET_KEY);
        assertThat(jwt.isExpired()).isFalse();
    }

    @Test
    @DisplayName("isExpired() is true for a token whose expiration is in the past")
    void isExpiredTrueForPastExpiration() {
        var jwt = new Jwt(claimsExpiringAt(new Date(System.currentTimeMillis() - 60_000)), SECRET_KEY);
        assertThat(jwt.isExpired()).isTrue();
    }

    @Test
    @DisplayName("getUserId() parses the subject claim back into a UUID")
    void getUserIdParsesSubject() {
        var userId = UUID.randomUUID();
        var claims = Jwts.claims()
                .subject(userId.toString())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .build();

        var jwt = new Jwt(claims, SECRET_KEY);

        assertThat(jwt.getUserId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("getRole() parses the role claim into the matching UserRole enum constant")
    void getRoleParsesRoleClaim() {
        var claims = Jwts.claims()
                .subject(UUID.randomUUID().toString())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .add(Map.of("role", "MANAGER"))
                .build();

        var jwt = new Jwt(claims, SECRET_KEY);

        assertThat(jwt.getRole()).isEqualTo(UserRole.MANAGER);
    }

    @Test
    @DisplayName("toString() produces a compact JWS that re-parses to the same claims")
    void toStringProducesReparsableToken() {
        var userId = UUID.randomUUID();
        var claims = Jwts.claims()
                .subject(userId.toString())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .add(Map.of("role", "ADMIN"))
                .build();
        var jwt = new Jwt(claims, SECRET_KEY);

        var serialized = jwt.toString();

        var reparsedClaims = Jwts.parser()
                .verifyWith(SECRET_KEY)
                .build()
                .parseSignedClaims(serialized)
                .getPayload();
        var reparsed = new Jwt(reparsedClaims, SECRET_KEY);

        assertThat(serialized).matches("^[\\w-]+\\.[\\w-]+\\.[\\w-]+$"); // header.payload.signature
        assertThat(reparsed.getUserId()).isEqualTo(userId);
        assertThat(reparsed.getRole()).isEqualTo(UserRole.ADMIN);
    }
}
