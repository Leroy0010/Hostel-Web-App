package com.leroy.hostelbackend.module.auth.repository;

import com.leroy.hostelbackend.module.auth.model.AuthToken;
import com.leroy.hostelbackend.module.auth.model.AuthTokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface AuthTokenRepository extends JpaRepository<AuthToken, UUID> {
    Optional<AuthToken> findByTokenHashAndType(String tokenHash, AuthTokenType type);
    void deleteByUserIdAndType(UUID userId, AuthTokenType type);
}