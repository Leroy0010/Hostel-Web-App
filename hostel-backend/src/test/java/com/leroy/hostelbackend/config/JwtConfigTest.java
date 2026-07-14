package com.leroy.hostelbackend.config;

import com.leroy.hostelbackend.module.auth.security.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit test for {@link JwtConfig#getSecretKey()}.
 *
 * <p>Small on purpose — this class is otherwise a plain
 * {@code @ConfigurationProperties} POJO with no logic beyond deriving an
 * HMAC {@code SecretKey} from the configured secret string. The one thing
 * worth pinning down is that the derivation is deterministic: two
 * {@code JwtConfig} instances configured with the same secret must
 * produce byte-identical keys, since {@link JwtService} relies on this to
 * verify tokens issued by a different instance (e.g. across app restarts,
 * or multiple horizontally-scaled instances sharing one secret).
 */
class JwtConfigTest {

    @Test
    @DisplayName("getSecretKey() derives the same key bytes from the same configured secret")
    void deriveSameKeyFromSameSecret() {
        var configA = new JwtConfig();
        configA.setSecret("shared-secret-of-at-least-32-bytes!!");
        var configB = new JwtConfig();
        configB.setSecret("shared-secret-of-at-least-32-bytes!!");

        assertThat(configA.getSecretKey().getEncoded())
                .isEqualTo(configB.getSecretKey().getEncoded());
    }

    @Test
    @DisplayName("getSecretKey() derives different key bytes from different secrets")
    void deriveDifferentKeysFromDifferentSecrets() {
        var configA = new JwtConfig();
        configA.setSecret("first-secret-of-at-least-32-bytes-long!");
        var configB = new JwtConfig();
        configB.setSecret("second-secret-of-at-least-32-bytes-long!");

        assertThat(configA.getSecretKey().getEncoded())
                .isNotEqualTo(configB.getSecretKey().getEncoded());
    }

    @Test
    @DisplayName("getSecretKey() reports the HMAC-SHA algorithm family")
    void secretKeyUsesHmacAlgorithm() {
        var config = new JwtConfig();
        config.setSecret("some-secret-of-at-least-32-bytes-long!!");

        assertThat(config.getSecretKey().getAlgorithm()).startsWith("HmacSHA");
    }
}
