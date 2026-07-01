package com.leroy.hostelbackend.config;

import io.jsonwebtoken.security.Keys;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import javax.crypto.SecretKey;

@Configuration
@ConfigurationProperties(prefix = "jwt")
@Data
public class JwtConfig {
    private int tokenExpiration;
    private int refreshTokenExpiration;
    private String secret;
    private boolean cookieSecure;
    private String cookieDomain;
    private String cookieSameSite;

    public SecretKey getSecretKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }
}

