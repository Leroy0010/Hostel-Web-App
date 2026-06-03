package com.leroy.hostelbackend.module.user.repository;

import com.leroy.hostelbackend.module.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link User} entities.
 *
 * <p>All query methods use {@code IgnoreCase} variants so that
 * {@code alice@example.com} and {@code Alice@Example.COM} resolve to the same account,
 * consistent with how email addresses work in practice.
 */
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Used by {@link com.leroy.hostelbackend.module.user.service.CustomUserDetailsService}
     * during authentication and by {@link com.leroy.hostelbackend.module.user.service.UserService}
     * for duplicate-email checks on registration.
     *
     * @param email the email address to search for (case-insensitive)
     * @return an {@link Optional} containing the user if found
     */
    Optional<User> findByEmailIgnoreCase(String email);

    /**
     * Lightweight existence check used before creating a new account.
     * Avoids loading the full entity when we only need to know if the email is taken.
     *
     * @param email the email to check (case-insensitive)
     * @return {@code true} if an account already exists with that email
     */
    boolean existsByEmailIgnoreCase(String email);
}