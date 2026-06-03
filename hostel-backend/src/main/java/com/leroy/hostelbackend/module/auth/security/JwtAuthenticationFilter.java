package com.leroy.hostelbackend.module.auth.security;

import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT authentication filter. Runs once per request.
 *
 * <p><strong>What it does:</strong>
 * <ol>
 *   <li>Extracts the Bearer token from the {@code Authorization} header.</li>
 *   <li>Parses and validates the token via {@link JwtService}.</li>
 *   <li>Loads the {@link CustomUserDetails} from the database using the user ID embedded
 *       in the token claims.</li>
 *   <li>Stores a fully populated {@link UsernamePasswordAuthenticationToken} — with
 *       {@code CustomUserDetails} as the principal — in the {@link SecurityContextHolder}.</li>
 * </ol>
 *
 * <p><strong>Why load from the database on every request?</strong><br>
 * The JWT only carries a user ID and role snapshot. If an admin deactivates an account
 * mid-session, the next request will still carry a valid token but
 * {@link CustomUserDetails#isEnabled()} will return {@code false} and Spring Security
 * will reject the request with {@code 401}. Without this DB check the account would
 * remain effectively active until the token expires.
 *
 * <p><strong>Previous bug fixed here:</strong><br>
 * The old filter called {@code jwtService.parseToken(token)} three times. Each call
 * re-parses the JWT signature — needlessly expensive. The token is now parsed exactly
 * once and reused.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        var authHeader = request.getHeader("Authorization");

        // No Bearer token present — pass through and let Spring Security decide
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        var token = authHeader.substring(7); // strip "Bearer " prefix

        // Parse the token exactly once
        var jwt = jwtService.parseToken(token);
        if (jwt == null || jwt.isExpired()) {
            filterChain.doFilter(request, response);
            return;
        }

        // Only set authentication if there isn't one already (e.g. from a prior filter)
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            var userId = jwt.getUserId();

            // Load user from DB so we honour real-time deactivation
            var userOptional = userRepository.findById(userId);
            if (userOptional.isEmpty()) {
                log.debug("JWT references a user that no longer exists: {}", userId);
                filterChain.doFilter(request, response);
                return;
            }

            var user = userOptional.get();

            // Reject deactivated accounts even if the token is still valid
            if (Boolean.FALSE.equals(user.getIsActive())) {
                log.warn("Rejected request from deactivated account: {}", userId);
                filterChain.doFilter(request, response);
                return;
            }

            var userDetails = new CustomUserDetails(user);

            var authentication = new UsernamePasswordAuthenticationToken(
                    userDetails,          // principal — the full CustomUserDetails object
                    null,                 // credentials — null after authentication
                    userDetails.getAuthorities()
            );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}