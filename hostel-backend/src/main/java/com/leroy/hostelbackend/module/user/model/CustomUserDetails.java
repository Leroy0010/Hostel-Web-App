package com.leroy.hostelbackend.module.user.model;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Spring Security {@link UserDetails} adapter for the {@link User} entity.
 *
 * <p><strong>Why a custom class instead of Spring's built-in {@code User}?</strong><br>
 * Spring's {@code org.springframework.security.core.userdetails.User} discards every field
 * that is not username/password/authorities the moment it is constructed. That means we
 * would lose {@code id}, {@code role}, {@code isActive}, etc. and have to hit the database
 * again inside every secured endpoint just to get the current user's UUID. By snapshotting
 * the fields we care about here — inside a {@code @Transactional} boundary — we avoid
 * that extra query and any risk of a {@code LazyInitializationException}.
 *
 * <p><strong>What is snapshotted at construction time:</strong>
 * <ul>
 *   <li>{@code userId}   – used in every service method that needs the caller's ID</li>
 *   <li>{@code email}    – Spring Security username</li>
 *   <li>{@code password} – BCrypt hash, needed only during authentication</li>
 *   <li>{@code role}     – single role mapped to a {@code ROLE_} prefixed authority</li>
 *   <li>{@code isActive} – drives {@link #isEnabled()} so Spring rejects deactivated accounts</li>
 * </ul>
 *
 * <p>This object is stored in the {@link org.springframework.security.core.context.SecurityContext}
 * for the lifetime of the request. Do <em>not</em> store mutable state here.
 */
@Getter
public class CustomUserDetails implements UserDetails {

    /** The database PK — injected into services via {@code AuthService.getAuthenticatedUser()}. */
    private final UUID userId;

    /** Stored as the Spring Security "username" (our system uses email as the login identifier). */
    private final String email;

    private final String password;

    /** Snapshot of the user's role at login time. Used to build the single {@link GrantedAuthority}. */
    private final UserRole role;

    private final boolean active;

    /**
     * Constructs a fully populated {@code CustomUserDetails} from a managed {@link User} entity.
     * Must be called inside a {@code @Transactional} context so that all fields are accessible.
     *
     * @param user the fully loaded {@link User} entity
     */
    public CustomUserDetails(User user) {
        this.userId   = user.getId();
        this.email    = user.getEmail();
        this.password = user.getPassword();
        this.role     = user.getRole();
        this.active   = Boolean.TRUE.equals(user.getIsActive());
    }

    // -------------------------------------------------------------------------
    // UserDetails contract
    // -------------------------------------------------------------------------

    /**
     * Returns a single authority in the {@code ROLE_<ROLE_NAME>} format expected by
     * Spring Security's {@code hasRole()} checks.
     *
     * <p>Example: role {@code ADMIN} → authority {@code "ROLE_ADMIN"}.
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return password;
    }

    /** Spring Security's concept of "username" — in our domain this is the email address. */
    @Override
    public String getUsername() {
        return email;
    }

    /**
     * Returning {@code false} here causes Spring Security to throw a
     * {@code DisabledException} before the password is even checked.
     * We surface this as a {@code 401} in the global exception handler.
     */
    @Override
    public boolean isEnabled() {
        return active;
    }
}