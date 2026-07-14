package com.leroy.hostelbackend.module.auth.service;

import com.leroy.hostelbackend.config.JwtConfig;
import com.leroy.hostelbackend.module.auth.dto.PasswordChangeRequest;
import com.leroy.hostelbackend.module.auth.dto.PasswordResetConfirmRequest;
import com.leroy.hostelbackend.module.auth.dto.PasswordResetRequest;
import com.leroy.hostelbackend.module.auth.dto.ResendVerificationRequest;
import com.leroy.hostelbackend.module.auth.model.AuthToken;
import com.leroy.hostelbackend.module.auth.model.AuthTokenType;
import com.leroy.hostelbackend.module.auth.repository.AuthTokenRepository;
import com.leroy.hostelbackend.module.email.service.EmailService;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.exception.TokenExpiredException;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.leroy.hostelbackend.testsupport.TestFixtures.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AuthService}.
 *
 * <p>Deliberately does not cover login itself — {@code AuthService} has no
 * login method; that flow lives elsewhere. This covers what actually is
 * here: the email-verification lifecycle, authenticated password change,
 * the forgot-password flow, and the refresh-cookie attribute consistency
 * the class's own Javadoc calls out as critical (mismatched attributes
 * between set/clear previously meant logout never actually cleared the
 * cookie in production).
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository      userRepository;
    @Mock private AuthTokenRepository authTokenRepository;
    @Mock private PasswordEncoder     passwordEncoder;
    @Mock private EmailService        emailService;
    @Mock private JwtConfig           jwtConfig;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository, authTokenRepository, passwordEncoder, emailService, jwtConfig);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(User user) {
        var principal = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    // =========================================================================
    // getAuthenticatedUserDetails / getAuthenticatedUser
    // =========================================================================

    @Nested
    @DisplayName("getAuthenticatedUserDetails / getAuthenticatedUser")
    class GetAuthenticatedUser {

        @Test
        @DisplayName("throws IllegalStateException when there is no authentication in context")
        void throwsWhenNoAuthentication() {
            assertThatThrownBy(() -> authService.getAuthenticatedUserDetails())
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        @DisplayName("throws IllegalStateException when the principal is not a CustomUserDetails")
        void throwsWhenWrongPrincipalType() {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken("plain-string-principal", null, List.of()));

            assertThatThrownBy(() -> authService.getAuthenticatedUserDetails())
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        @DisplayName("throws UsernameNotFoundException when the authenticated user no longer exists in the DB")
        void throwsWhenUserDeleted() {
            var user = student("Lexa", "Doe");
            authenticateAs(user);
            when(userRepository.findById(user.getId())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.getAuthenticatedUser())
                    .isInstanceOf(UsernameNotFoundException.class);
        }

        @Test
        @DisplayName("returns the current User when authenticated and present in the DB")
        void returnsAuthenticatedUser() {
            var user = student("Lexa", "Doe");
            authenticateAs(user);
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

            assertThat(authService.getAuthenticatedUser()).isEqualTo(user);
        }
    }

    // =========================================================================
    // Email verification flow
    // =========================================================================

    @Nested
    @DisplayName("email verification flow")
    class EmailVerification {

        @Test
        @DisplayName("createEmailVerificationToken deactivates the user before issuing the token")
        void deactivatesUserAndIssuesToken() {
            var user = student("Lexa", "Doe");
            user.setIsActive(true);

            authService.createEmailVerificationToken(user);

            assertThat(user.getIsActive()).isFalse();
            verify(userRepository).save(user);
            var captor = ArgumentCaptor.forClass(AuthToken.class);
            verify(authTokenRepository).save(captor.capture());
            assertThat(captor.getValue().getType()).isEqualTo(AuthTokenType.EMAIL_VERIFICATION);
            assertThat(captor.getValue().getExpiresAt())
                    .isAfter(LocalDateTime.now().plusHours(23))
                    .isBefore(LocalDateTime.now().plusHours(25));
        }

        @Test
        @DisplayName("verifyEmail throws for a token that doesn't exist")
        void rejectsUnknownToken() {
            when(authTokenRepository.findByTokenHashAndType(any(), eq(AuthTokenType.EMAIL_VERIFICATION)))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.verifyEmail("bogus-token"))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("verifyEmail deletes and rejects an expired token")
        void rejectsExpiredToken() {
            var token = expiredToken(AuthTokenType.EMAIL_VERIFICATION);
            when(authTokenRepository.findByTokenHashAndType(any(), eq(AuthTokenType.EMAIL_VERIFICATION)))
                    .thenReturn(Optional.of(token));

            assertThatThrownBy(() -> authService.verifyEmail("expired-token"))
                    .isInstanceOf(TokenExpiredException.class);
            verify(authTokenRepository).delete(token);
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("verifyEmail activates the user and single-use-deletes the token on success")
        void activatesUserAndConsumesToken() {
            var user = student("Lexa", "Doe");
            user.setIsActive(false);
            var token = validToken(user, AuthTokenType.EMAIL_VERIFICATION);
            when(authTokenRepository.findByTokenHashAndType(any(), eq(AuthTokenType.EMAIL_VERIFICATION)))
                    .thenReturn(Optional.of(token));

            authService.verifyEmail("good-token");

            assertThat(user.getIsActive()).isTrue();
            verify(userRepository).save(user);
            verify(authTokenRepository).delete(token);
        }

        @Test
        @DisplayName("resendVerificationEmail silently no-ops for an unknown email (anti-enumeration)")
        void silentlyNoOpsForUnknownEmail() {
            when(userRepository.findByEmailIgnoreCase("nobody@ucc.edu.gh")).thenReturn(Optional.empty());

            authService.resendVerificationEmail(new ResendVerificationRequest("nobody@ucc.edu.gh"));

            verifyNoInteractions(emailService);
            verify(authTokenRepository, never()).save(any());
        }

        @Test
        @DisplayName("resendVerificationEmail silently no-ops for an already-active account")
        void silentlyNoOpsForActiveAccount() {
            var user = student("Lexa", "Doe");
            user.setIsActive(true);
            when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));

            authService.resendVerificationEmail(new ResendVerificationRequest(user.getEmail()));

            verifyNoInteractions(emailService);
        }

        @Test
        @DisplayName("resendVerificationEmail issues a new token and emails it for an inactive account")
        void issuesNewTokenForInactiveAccount() {
            var user = student("Lexa", "Doe");
            user.setIsActive(false);
            when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));

            authService.resendVerificationEmail(new ResendVerificationRequest(user.getEmail()));

            verify(authTokenRepository).save(any(AuthToken.class));
            verify(emailService).sendStudentVerificationEmail(eq(user.getEmail()), eq(user.getName()), anyString());
        }
    }

    // =========================================================================
    // changePassword
    // =========================================================================

    @Nested
    @DisplayName("changePassword")
    class ChangePassword {

        @Test
        @DisplayName("throws BadCredentialsException when the current password is wrong")
        void rejectsWrongCurrentPassword() {
            var user = student("Lexa", "Doe");
            user.setPassword("hashed-old");
            authenticateAs(user);
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("wrong", "hashed-old")).thenReturn(false);

            var request = new PasswordChangeRequest("wrong", "N3wStr0ngP@ss!");

            assertThatThrownBy(() -> authService.changePassword(request))
                    .isInstanceOf(BadCredentialsException.class);
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("encodes and persists the new password on success")
        void encodesAndPersistsNewPassword() {
            var user = student("Lexa", "Doe");
            user.setPassword("hashed-old");
            authenticateAs(user);
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("correct-old", "hashed-old")).thenReturn(true);
            when(passwordEncoder.encode("N3wStr0ngP@ss!")).thenReturn("hashed-new");

            authService.changePassword(new PasswordChangeRequest("correct-old", "N3wStr0ngP@ss!"));

            assertThat(user.getPassword()).isEqualTo("hashed-new");
            verify(userRepository).save(user);
        }
    }

    // =========================================================================
    // Password reset flow
    // =========================================================================

    @Nested
    @DisplayName("password reset flow")
    class PasswordReset {

        @Test
        @DisplayName("initiatePasswordReset silently no-ops for an unknown email (anti-enumeration)")
        void silentlyNoOpsForUnknownEmail() {
            when(userRepository.findByEmailIgnoreCase("nobody@ucc.edu.gh")).thenReturn(Optional.empty());

            authService.initiatePasswordReset(new PasswordResetRequest("nobody@ucc.edu.gh"));

            verifyNoInteractions(emailService);
        }

        @Test
        @DisplayName("initiatePasswordReset issues a 15-minute token and emails it")
        void issuesFifteenMinuteToken() {
            var user = student("Lexa", "Doe");
            when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));

            authService.initiatePasswordReset(new PasswordResetRequest(user.getEmail()));

            var captor = ArgumentCaptor.forClass(AuthToken.class);
            verify(authTokenRepository).save(captor.capture());
            assertThat(captor.getValue().getType()).isEqualTo(AuthTokenType.PASSWORD_RESET);
            assertThat(captor.getValue().getExpiresAt())
                    .isAfter(LocalDateTime.now().plusMinutes(14))
                    .isBefore(LocalDateTime.now().plusMinutes(16));
            verify(emailService).sendPasswordResetEmail(eq(user.getEmail()), eq(user.getName()), anyString());
        }

        @Test
        @DisplayName("completePasswordReset throws for an unknown token")
        void rejectsUnknownToken() {
            when(authTokenRepository.findByTokenHashAndType(any(), eq(AuthTokenType.PASSWORD_RESET)))
                    .thenReturn(Optional.empty());
            var request = new PasswordResetConfirmRequest("bogus", "N3wStr0ngP@ss!", "reset");

            assertThatThrownBy(() -> authService.completePasswordReset(request))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("completePasswordReset deletes and rejects an expired token")
        void rejectsExpiredToken() {
            var token = expiredToken(AuthTokenType.PASSWORD_RESET);
            when(authTokenRepository.findByTokenHashAndType(any(), eq(AuthTokenType.PASSWORD_RESET)))
                    .thenReturn(Optional.of(token));
            var request = new PasswordResetConfirmRequest("expired", "N3wStr0ngP@ss!", "reset");

            assertThatThrownBy(() -> authService.completePasswordReset(request))
                    .isInstanceOf(IllegalStateException.class);
            verify(authTokenRepository).delete(token);
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("completePasswordReset resets the password and purges all reset tokens for the user")
        void resetsPasswordAndPurgesTokens() {
            var user = student("Lexa", "Doe");
            var token = validToken(user, AuthTokenType.PASSWORD_RESET);
            when(authTokenRepository.findByTokenHashAndType(any(), eq(AuthTokenType.PASSWORD_RESET)))
                    .thenReturn(Optional.of(token));
            when(passwordEncoder.encode("N3wStr0ngP@ss!")).thenReturn("hashed-new");
            var request = new PasswordResetConfirmRequest("good", "N3wStr0ngP@ss!", "reset");

            authService.completePasswordReset(request);

            assertThat(user.getPassword()).isEqualTo("hashed-new");
            verify(userRepository).save(user);
            verify(authTokenRepository).deleteByUserIdAndType(user.getId(), AuthTokenType.PASSWORD_RESET);
        }

        @Test
        @DisplayName("completePasswordReset also activates the account when type is \"activation\"")
        void activatesAccountForActivationType() {
            var user = student("Lexa", "Doe");
            user.setIsActive(false);
            var token = validToken(user, AuthTokenType.PASSWORD_RESET);
            when(authTokenRepository.findByTokenHashAndType(any(), eq(AuthTokenType.PASSWORD_RESET)))
                    .thenReturn(Optional.of(token));
            when(passwordEncoder.encode(any())).thenReturn("hashed-new");
            var request = new PasswordResetConfirmRequest("good", "N3wStr0ngP@ss!", "activation");

            authService.completePasswordReset(request);

            assertThat(user.getIsActive()).isTrue();
        }

        @Test
        @DisplayName("completePasswordReset does NOT activate the account for a plain reset (type != activation)")
        void doesNotActivateForPlainReset() {
            var user = student("Lexa", "Doe");
            user.setIsActive(false);
            var token = validToken(user, AuthTokenType.PASSWORD_RESET);
            when(authTokenRepository.findByTokenHashAndType(any(), eq(AuthTokenType.PASSWORD_RESET)))
                    .thenReturn(Optional.of(token));
            when(passwordEncoder.encode(any())).thenReturn("hashed-new");
            var request = new PasswordResetConfirmRequest("good", "N3wStr0ngP@ss!", "reset");

            authService.completePasswordReset(request);

            assertThat(user.getIsActive()).isFalse();
        }
    }

    // =========================================================================
    // Refresh-cookie attribute consistency
    // =========================================================================

    @Nested
    @DisplayName("setAuthCookie / clearAuthCookie attribute consistency")
    class CookieConsistency {

        @BeforeEach
        void stubCookieConfig() {
            when(jwtConfig.isCookieSecure()).thenReturn(true);
            when(jwtConfig.getCookieDomain()).thenReturn("hostelifeplus.com");
            when(jwtConfig.getCookieSameSite()).thenReturn("None");
            when(jwtConfig.getRefreshTokenExpiration()).thenReturn(1_209_600);
        }

        /**
         * The class Javadoc is explicit that a cookie is identified by the
         * tuple (name, domain, path) and that clearAuthCookie must reuse the
         * exact same attributes setAuthCookie used, or the browser creates a
         * second cookie instead of deleting the first. This test verifies
         * that contract directly rather than trusting the Javadoc's claim.
         */
        @Test
        @DisplayName("clearAuthCookie reuses the exact same path/secure/sameSite/domain attributes as setAuthCookie")
        void clearReusesSameAttributesAsSet() {
            HttpServletResponse setResponse = new MockHttpServletResponse();
            HttpServletResponse clearResponse = new MockHttpServletResponse();

            authService.setAuthCookie(setResponse, "some-refresh-token");
            authService.clearAuthCookie(clearResponse);

            String setHeader = setResponse.getHeader("Set-Cookie");
            String clearHeader = clearResponse.getHeader("Set-Cookie");

            assertThat(setHeader).contains("Path=/", "Secure", "SameSite=None", "Domain=hostelifeplus.com");
            assertThat(clearHeader).contains("Path=/", "Secure", "SameSite=None", "Domain=hostelifeplus.com");
            // The only attributes that should legitimately differ are the
            // token value itself and Max-Age (0 to expire immediately).
            assertThat(clearHeader).contains("Max-Age=0");
        }

        @Test
        @DisplayName("setAuthCookie marks the cookie httpOnly")
        void setCookieIsHttpOnly() {
            HttpServletResponse response = new MockHttpServletResponse();
            authService.setAuthCookie(response, "some-refresh-token");
            assertThat(response.getHeader("Set-Cookie")).containsIgnoringCase("HttpOnly");
        }
    }

    // =========================================================================
    // generateAndSaveToken (crypto token engine)
    // =========================================================================

    @Nested
    @DisplayName("generateAndSaveToken")
    class GenerateAndSaveToken {

        @Test
        @DisplayName("clears any previous token of the same type before issuing a new one")
        void clearsPreviousTokenFirst() {
            var user = student("Lexa", "Doe");

            authService.generateAndSaveToken(user, AuthTokenType.EMAIL_VERIFICATION, 60);

            var inOrder = inOrder(authTokenRepository);
            inOrder.verify(authTokenRepository)
                    .deleteByUserIdAndType(user.getId(), AuthTokenType.EMAIL_VERIFICATION);
            inOrder.verify(authTokenRepository).save(any(AuthToken.class));
        }

        @Test
        @DisplayName("returns a 64-character hex string (32 random bytes)")
        void returnsSixtyFourCharHexToken() {
            var user = student("Lexa", "Doe");

            String token = authService.generateAndSaveToken(user, AuthTokenType.EMAIL_VERIFICATION, 60);

            assertThat(token).hasSize(64).matches("^[0-9a-f]{64}$");
        }

        @Test
        @DisplayName("never persists the raw token — only its SHA-256 hash")
        void neverPersistsRawToken() {
            var user = student("Lexa", "Doe");

            String rawToken = authService.generateAndSaveToken(user, AuthTokenType.EMAIL_VERIFICATION, 60);

            var captor = ArgumentCaptor.forClass(AuthToken.class);
            verify(authTokenRepository).save(captor.capture());
            assertThat(captor.getValue().getTokenHash()).isNotEqualTo(rawToken);
            assertThat(captor.getValue().getTokenHash()).hasSize(64); // SHA-256 hex digest length
        }

        @Test
        @DisplayName("generates a different token on each call")
        void generatesUniqueTokensEachCall() {
            var user = student("Lexa", "Doe");

            String first = authService.generateAndSaveToken(user, AuthTokenType.EMAIL_VERIFICATION, 60);
            String second = authService.generateAndSaveToken(user, AuthTokenType.EMAIL_VERIFICATION, 60);

            assertThat(first).isNotEqualTo(second);
        }
    }

    // =========================================================================
    // Fixture helpers local to this test class
    // =========================================================================

    private static AuthToken validToken(User user, AuthTokenType type) {
        var token = new AuthToken();
        token.setId(UUID.randomUUID());
        token.setUser(user);
        token.setTokenHash("irrelevant-in-these-tests");
        token.setType(type);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        return token;
    }

    private static AuthToken expiredToken(AuthTokenType type) {
        var token = new AuthToken();
        token.setId(UUID.randomUUID());
        token.setUser(student("Someone", "Else"));
        token.setTokenHash("irrelevant-in-these-tests");
        token.setType(type);
        token.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        return token;
    }
}
