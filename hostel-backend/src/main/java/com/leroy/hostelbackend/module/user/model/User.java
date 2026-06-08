package com.leroy.hostelbackend.module.user.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import com.leroy.hostelbackend.module.user.service.CustomUserDetailsService;
import com.leroy.hostelbackend.shared.exception.UserDeactivatedException;
import org.jspecify.annotations.NonNull;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Persistent entity representing every user in the system regardless of role.
 *
 * <p>Role differences:
 * <ul>
 *   <li>{@code STUDENT} — self-registers; can book rooms, raise complaints, leave reviews.</li>
 *   <li>{@code MANAGER} — created by an ADMIN; manages one or more hostels.</li>
 *   <li>{@code ADMIN}   — created by an ADMIN; full system control.</li>
 * </ul>
 *
 * <p>The {@code student_id} column has been intentionally removed — UCC students do not
 * need to supply their university ID number to hire accommodation on this platform.
 *
 * <p>The {@code password} field is mapped to the {@code password_hash} column so Hibernate
 * reads the BCrypt hash, not a plain-text password.
 */
@Getter
@Setter
@Entity
@Table(name = "users")
public class User {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Login identifier. Case-insensitive lookups are performed in the repository. */
    @Column(name = "email", nullable = false, unique = true)
    private String email;

    /**
     * BCrypt-hashed password. The column is named {@code password_hash} in the database
     * but exposed as {@code password} in Java to satisfy Spring Security's
     * {@code UserDetails#getPassword()} contract via {@link CustomUserDetails}.
     */
    @Column(name = "password_hash", nullable = false)
    private String password;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    /**
     * Phone number. Optional for STUDENT accounts; required when an ADMIN creates
     * a MANAGER or another ADMIN account (enforced at the DTO/service level).
     */
    @Column(name = "phone")
    private String phone;

    /**
     * Single role. Stored as a VARCHAR so adding new roles never requires a
     * PostgreSQL {@code ALTER TYPE} migration — Java enum is the sole enforcer.
     *
     * @see UserRole
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private UserRole role = UserRole.STUDENT;


    /**
     * Soft-delete / suspension flag. When {@code false}, {@link CustomUserDetailsService}
     * throws a {@link UserDeactivatedException}
     * before any password check occurs.
     */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /** Convenience method — used in JWT claim generation. */
    public String getName() {
        return firstName + " " + lastName;
    }

    public static @NonNull User create(String email, String firstName, String lastName, String phone, boolean isActive) {
        var user = new User();
        user.setEmail(email.toLowerCase().trim());
        user.setFirstName(firstName.trim());
        user.setLastName(lastName.trim());
        user.setPhone(phone);
        user.setIsActive(isActive);
        return user;
    }
}