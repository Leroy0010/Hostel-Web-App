package com.leroy.hostelbackend.module.user.repository;

import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link User} entities.
 *
 * <p>All query methods use {@code IgnoreCase} variants so that email lookups
 * are case-insensitive, consistent with how email addresses work in practice.
 */
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

    /**
     * Used by {@link com.leroy.hostelbackend.module.user.service.CustomUserDetailsService}
     * during authentication and by {@code UserService} for duplicate-email checks.
     */
    Optional<User> findByEmailIgnoreCase(String email);

    /**
     * Lightweight existence check before creating a new account.
     * Avoids loading the full entity when we only need to know if the email is taken.
     */
    boolean existsByEmailIgnoreCase(String email);

    /**
     * Returns the MANAGER assigned to a hostel.
     * Used by {@code BookingService} and {@code WaitlistService} to notify the
     * relevant manager when a new booking request or waitlist draft arrives.
     *
     * <p>Returns empty if the hostel has no manager assigned ({@code manager_id IS NULL}).
     *
     * @param hostelId UUID of the hostel
     */
    @Query("""
            SELECT h.manager FROM Hostel h
            WHERE h.id = :hostelId
              AND h.manager IS NOT NULL
            """)
    Optional<User> findManagerByHostelId(@Param("hostelId") UUID hostelId);

    List<User> findAllByRoleAndIsActiveTrue(UserRole role);
}