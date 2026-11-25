package com.leroy.hostelbackend.config;

import io.jsonwebtoken.security.Keys;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import javax.crypto.SecretKey;
import java.time.Duration;

@Configuration
@ConfigurationProperties(prefix = "jwt")
@Data
public class JwtConfig {
    /**
     * Access-token lifetime. Plain numbers are read as milliseconds (Spring's Duration default),
     * so existing values like 1800000 keep meaning 30 minutes; "30m" / "PT30M" also work.
     */
    private Duration tokenExpiration;
    /** Refresh-token lifetime (same format as {@link #tokenExpiration}). */
    private Duration refreshTokenExpiration;
    private String secret;
    private boolean cookieSecure;
    private String cookieDomain;
    private String cookieSameSite;

    public SecretKey getSecretKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }
}

