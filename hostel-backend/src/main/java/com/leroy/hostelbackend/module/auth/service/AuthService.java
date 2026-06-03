package com.leroy.hostelbackend.module.auth.service;

import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.UUID;

/**
 * Helper service for accessing the currently authenticated user.
 *
 * <p>The {@link org.springframework.security.core.context.SecurityContext} principal is
 * set by {@link com.leroy.hostelbackend.module.auth.security.JwtAuthenticationFilter}.
 * It stores a {@link CustomUserDetails} instance, so we can extract the UUID directly
 * from the security context <em>without</em> an extra database query in the common case.
 *
 * <p>A database fetch is only needed when callers require the full {@link User} entity
 * (e.g. to update fields). For read-only uses — such as checking the caller's role or ID
 * inside a service method — prefer {@link #getAuthenticatedUserDetails()} instead.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;

    /**
     * Returns the {@link CustomUserDetails} snapshot from the current security context.
     *
     * <p>This is a zero-database-query operation. Use it when you only need the caller's
     * {@code userId} or {@code role} (e.g., to build a query predicate).
     *
     * @return the authenticated user's details
     * @throws IllegalStateException if called outside a secured request (no authentication present)
     */
    public CustomUserDetails getAuthenticatedUserDetails() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails details)) {
            throw new IllegalStateException("No authenticated user found in the current security context.");
        }
        return details;
    }

    /**
     * Fetches the full {@link User} entity for the currently authenticated principal.
     *
     * <p>Incurs one database query. Use only when the full entity is required
     * (e.g. updating profile data). For ID / role checks alone, prefer
     * {@link #getAuthenticatedUserDetails()}.
     *
     * @return the authenticated user's full entity
     * @throws UsernameNotFoundException if the user no longer exists in the database
     *                                   (e.g. account deleted between token issue and request)
     */
    public User getAuthenticatedUser() {
        var userId = UUID.fromString(
                Objects.requireNonNull(Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getPrincipal()).toString()
        );
        return userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Authenticated user no longer exists: " + userId
                ));
    }
}