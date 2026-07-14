package com.leroy.hostelbackend.module.auth.security;

import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.model.UserRole;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import org.assertj.core.api.InstanceOfAssertFactories;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link JwtAuthenticationFilter} — the single filter that
 * populates (or deliberately leaves empty) the {@link SecurityContextHolder}
 * for every request in the app. A bug here either locks everyone out or,
 * far worse, authenticates someone who shouldn't be, so every short-circuit
 * branch gets its own explicit "context stays empty" assertion rather than
 * only checking the happy path.
 */
@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock private JwtService jwtService;
    @Mock private UserRepository userRepository;
    @Mock private FilterChain filterChain;

    private JwtAuthenticationFilter filter;

    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtService, userRepository);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
    }

    @AfterEach
    void clearSecurityContext() {
        // The filter under test writes directly to this static holder — an
        // un-cleared context here would leak authenticated state into
        // unrelated tests run afterward in the same JVM.
        SecurityContextHolder.clearContext();
    }

    private User activeUser(UserRole role) {
        var user = new User();
        user.setId(userId);
        user.setEmail("lexa.doe@ucc.edu.gh");
        user.setPassword("hashed");
        user.setFirstName("Lexa");
        user.setLastName("Doe");
        user.setRole(role);
        user.setIsActive(true);
        return user;
    }

    private Jwt validJwtFor(UUID subject) {
        Jwt jwt = mock(Jwt.class);
        lenient().when(jwt.isExpired()).thenReturn(false);
        lenient().when(jwt.getUserId()).thenReturn(subject);
        return jwt;
    }

    @Nested
    @DisplayName("requests that must NOT be authenticated")
    class ShortCircuitPaths {

        @Test
        @DisplayName("no Authorization header at all — passes through untouched")
        void noAuthorizationHeader() throws Exception {
            filter.doFilterInternal(request, response, filterChain);

            assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
            verify(filterChain).doFilter(request, response);
            verifyNoInteractions(jwtService, userRepository);
        }

        @Test
        @DisplayName("Authorization header present but missing the \"Bearer \" prefix")
        void headerWithoutBearerPrefix() throws Exception {
            request.addHeader("Authorization", "Basic dXNlcjpwYXNz");

            filter.doFilterInternal(request, response, filterChain);

            assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
            verify(filterChain).doFilter(request, response);
            verifyNoInteractions(jwtService, userRepository);
        }

        @Test
        @DisplayName("token fails to parse (bad signature / malformed) — jwtService returns null")
        void unparseableToken() throws Exception {
            request.addHeader("Authorization", "Bearer garbage-token");
            when(jwtService.parseToken("garbage-token")).thenReturn(null);

            filter.doFilterInternal(request, response, filterChain);

            assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
            verify(filterChain).doFilter(request, response);
            verifyNoInteractions(userRepository);
        }

        @Test
        @DisplayName("token parses but is expired")
        void expiredToken() throws Exception {
            request.addHeader("Authorization", "Bearer expired-token");
            Jwt expiredJwt = mock(Jwt.class);
            when(expiredJwt.isExpired()).thenReturn(true);
            when(jwtService.parseToken("expired-token")).thenReturn(expiredJwt);

            filter.doFilterInternal(request, response, filterChain);

            assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
            verify(filterChain).doFilter(request, response);
            verifyNoInteractions(userRepository);
        }

        @Test
        @DisplayName("token is valid but references a user id that no longer exists")
        void userNoLongerExists() throws Exception {
            request.addHeader("Authorization", "Bearer valid-token");
            Jwt validJwt = validJwtFor(userId);
            when(jwtService.parseToken("valid-token")).thenReturn(validJwt);
            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            filter.doFilterInternal(request, response, filterChain);

            assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
            verify(filterChain).doFilter(request, response);
        }

        @Test
        @DisplayName("token is valid but the account has since been deactivated")
        void deactivatedAccount() throws Exception {
            request.addHeader("Authorization", "Bearer valid-token");
            Jwt validJwt = validJwtFor(userId);
            when(jwtService.parseToken("valid-token")).thenReturn(validJwt);
            var deactivated = activeUser(UserRole.STUDENT);
            deactivated.setIsActive(false);
            when(userRepository.findById(userId)).thenReturn(Optional.of(deactivated));

            filter.doFilterInternal(request, response, filterChain);

            assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
            verify(filterChain).doFilter(request, response);
        }

        @Test
        @DisplayName("a null isActive is NOT treated as deactivated — the guard only rejects an explicit false")
        void nullIsActiveIsNotRejected() throws Exception {
            // NOTE: this pins down real (if slightly surprising) behavior rather
            // than the behavior one might assume. The filter's guard is
            // `Boolean.FALSE.equals(user.getIsActive())`, and `Boolean.FALSE.equals(null)`
            // evaluates to `false` — so a null isActive is NOT rejected here; the
            // request is authenticated as if the account were active. In practice
            // `isActive` defaults to `true` at the entity level and null should
            // never occur outside manual DB manipulation, but a stricter guard
            // (e.g. `!Boolean.TRUE.equals(...)`) would fail closed instead of open
            // if that ever changed. Flagging as an observation, not altering source.
            request.addHeader("Authorization", "Bearer valid-token");
            Jwt validJwt = validJwtFor(userId);
            when(jwtService.parseToken("valid-token")).thenReturn(validJwt);
            var user = activeUser(UserRole.STUDENT);
            user.setIsActive(null);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            filter.doFilterInternal(request, response, filterChain);

            assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        }
    }

    @Nested
    @DisplayName("successful authentication")
    class SuccessfulAuthentication {

        @Test
        @DisplayName("valid token + active user populates the SecurityContext with the correct principal and authority")
        void populatesSecurityContext() throws Exception {
            request.addHeader("Authorization", "Bearer valid-token");
            Jwt validJwt = validJwtFor(userId);
            when(jwtService.parseToken("valid-token")).thenReturn(validJwt);
            when(userRepository.findById(userId)).thenReturn(Optional.of(activeUser(UserRole.MANAGER)));

            filter.doFilterInternal(request, response, filterChain);

            var authentication = SecurityContextHolder.getContext().getAuthentication();
            assertThat(authentication).isNotNull();
            assertThat(authentication.isAuthenticated()).isTrue();
            assertThat(authentication.getPrincipal())
                    .asInstanceOf(InstanceOfAssertFactories.type(CustomUserDetails.class))
                    .extracting("userId")
                    .isEqualTo(userId);
            assertThat(authentication.getAuthorities())
                    .extracting(Object::toString)
                    .containsExactly("ROLE_MANAGER");
            verify(filterChain).doFilter(request, response);
        }

        @Test
        @DisplayName("credentials on the resulting Authentication are null (never re-expose the password hash)")
        void credentialsAreNull() throws Exception {
            request.addHeader("Authorization", "Bearer valid-token");
            Jwt validJwt = validJwtFor(userId);
            when(jwtService.parseToken("valid-token")).thenReturn(validJwt);
            when(userRepository.findById(userId)).thenReturn(Optional.of(activeUser(UserRole.STUDENT)));

            filter.doFilterInternal(request, response, filterChain);

            assertThat(SecurityContextHolder.getContext().getAuthentication().getCredentials()).isNull();
        }

        @Test
        @DisplayName("does not query the database again when an Authentication is already present")
        void doesNotOverwriteExistingAuthentication() throws Exception {
            var existing = new UsernamePasswordAuthenticationToken("someone-else", null, List.of());
            SecurityContextHolder.getContext().setAuthentication(existing);

            request.addHeader("Authorization", "Bearer valid-token");
            Jwt validJwt = validJwtFor(userId);
            when(jwtService.parseToken("valid-token")).thenReturn(validJwt);

            filter.doFilterInternal(request, response, filterChain);

            assertThat(SecurityContextHolder.getContext().getAuthentication()).isSameAs(existing);
            verifyNoInteractions(userRepository);
            verify(filterChain).doFilter(request, response);
        }
    }

    @Test
    @DisplayName("always continues the filter chain exactly once, regardless of outcome")
    void alwaysContinuesFilterChainExactlyOnce() throws Exception {
        filter.doFilterInternal(request, response, filterChain);
        verify(filterChain, times(1)).doFilter(any(), any());
    }
}
