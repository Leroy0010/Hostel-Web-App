package com.leroy.hostelbackend.module.auth.security;

import com.leroy.hostelbackend.module.user.model.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

public class Jwt {
    private final Claims claims;
    private final SecretKey secretKey;

    public Jwt(Claims claims, SecretKey secretKey) {
        this.claims = claims;
        this.secretKey = secretKey;
    }

    public boolean isExpired(){
        try {
            return claims.getExpiration().before(new Date());
        } catch (JwtException e) {
            return false;
        }

    }

    public UUID getUserId(){
        return UUID.fromString(claims.getSubject());
    }

    public UserRole getRole(){
        return UserRole.valueOf(claims.get("role", String.class));
    }


    @Override
    public String toString(){
        return Jwts.builder()
                .claims(claims)
                .signWith(secretKey)
                .compact();
    }
}

