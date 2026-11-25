package com.leroy.hostelbackend.module.auth.service;

import com.leroy.hostelbackend.config.JwtConfig;
import com.leroy.hostelbackend.module.auth.model.RefreshToken;
import com.leroy.hostelbackend.module.auth.repository.RefreshTokenRepository;
import com.leroy.hostelbackend.module.user.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock JwtConfig jwtConfig;
    @InjectMocks RefreshTokenService service;

    @BeforeEach
    void setUp() {
        when(jwtConfig.getRefreshTokenExpiration()).thenReturn(Duration.ofHours(2));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void createStoresOnlyTheHashAndExposesRawTokenTransiently() {
        RefreshToken created = service.createRefreshToken(new User());

        assertThat(created.getRawToken()).hasSize(64);
        assertThat(created.getToken()).isEqualTo(RefreshTokenService.hash(created.getRawToken()));
        assertThat(created.getToken()).isNotEqualTo(created.getRawToken());
        assertThat(created.getExpiresAt())
                .isCloseTo(LocalDateTime.now().plusHours(2), within(Duration.ofSeconds(5).toSeconds(), java.time.temporal.ChronoUnit.SECONDS));
    }

    @Test
    void rotateLooksUpByHashOfTheCookieValue() {
        RefreshToken existing = service.createRefreshToken(new User());
        String cookieValue = existing.getRawToken();
        when(refreshTokenRepository.findByToken(RefreshTokenService.hash(cookieValue))).thenReturn(Optional.of(existing));

        RefreshToken rotated = service.rotateRefreshToken(cookieValue);

        assertThat(existing.getIsRevoked()).isTrue();
        assertThat(rotated.getRawToken()).isNotEqualTo(cookieValue);
    }
}
