package com.leroy.hostelbackend.module.user.service;

import com.leroy.hostelbackend.module.audit.annotation.Audited;
import com.leroy.hostelbackend.module.audit.context.AuditContext;
import com.leroy.hostelbackend.module.auth.model.AuthTokenType;
import com.leroy.hostelbackend.module.auth.service.AuthService;
import com.leroy.hostelbackend.module.email.service.EmailService;
import com.leroy.hostelbackend.module.user.dto.CreateStaffRequest;
import com.leroy.hostelbackend.module.user.dto.UserDto;
import com.leroy.hostelbackend.module.user.mapper.UserMapper;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.model.UserRole;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.UUID;

/**
 * Admin-scoped user management service.
 *
 * <p>Handles the operations that only an ADMIN can perform on user accounts:
 * listing all users (with role and search filters), creating staff accounts,
 * and soft-activating/deactivating accounts.
 *
 * <p>Student self-registration lives in {@link UserService} and is intentionally
 * kept separate — it has different validation rules, sends a verification email,
 * and returns a {@code LoginResponse} with tokens.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserManagementService {

    private final UserRepository  userRepository;
    private final UserMapper      userMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuthService     authService;
    private final EmailService    emailService;

    // =========================================================================
    // Read
    // =========================================================================

    /**
     * Paginated list of all users with optional role and full-text search filters.
     *
     * <p>The search term is matched (case-insensitive) against first name,
     * last name, and email using a LIKE query. All parameters are optional —
     * omitting them returns all users.
     *
     * @param role     filter to a specific role; null returns all roles
     * @param search   partial match on name or email; null returns all
     * @param isActive filter by active/inactive status; null returns both
     * @param pageable pagination and sort params from the controller
     * @return page of {@link UserDto}
     */
    @Transactional(readOnly = true)
    public Page<UserDto> listUsers(
            UserRole role, String search, Boolean isActive, Pageable pageable
    ) {
        Specification<User> spec = buildSpec(role, search, isActive);
        return userRepository.findAll(spec, pageable).map(userMapper::toDto);
    }

    // =========================================================================
    // Create
    // =========================================================================

    /**
     * Creates a new MANAGER or ADMIN staff account.
     *
     * <p>The account starts inactive (no password set). An activation email
     * is sent so the staff member can set their password via the
     * {@code /setup-password} flow.
     *
     * @param request validated staff creation payload
     * @return the persisted {@link UserDto}
     * @throws IllegalArgumentException if the email is already in use or
     *                                  the caller attempts to create a STUDENT
     */
    @Audited(action = "STAFF_CREATED", targetType = "User",
            detail = "Created staff account: {0}")
    @Transactional
    public UserDto createStaff(CreateStaffRequest request) {
        if (request.getRole() == UserRole.STUDENT) {
            throw new IllegalArgumentException(
                    "Use the student registration endpoint to create student accounts.");
        }
        assertEmailAvailable(request.getEmail());

        // Business Rule: Validate that the corporate staff number is unique among active staff members
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            assertStaffPhoneAvailable(request.getPhone().trim());
        }

        var user = User.create(
                request.getEmail(),
                request.getFirstName(),
                request.getLastName(),
                request.getPhone(),
                false   // inactive until activation link is used
        );
        user.setRole(request.getRole());
        // Temporary placeholder hash — overwritten when the user sets their password
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        var saved = userRepository.save(user);

        String rawToken = authService.generateAndSaveToken(
                user, AuthTokenType.PASSWORD_RESET, 24 * 60);
        emailService.sendStaffActivationEmail(saved.getEmail(), user.getName(), rawToken);

        log.info("Staff account created: id={}, email={}, role={}",
                saved.getId(), saved.getEmail(), saved.getRole());
        return userMapper.toDto(saved);
    }

    // =========================================================================
    // Activate / deactivate
    // =========================================================================

    /**
     * Soft-deactivates a user account. The user can no longer log in but all
     * their data is preserved.
     *
     * @param userId UUID of the user to deactivate
     * @return updated {@link UserDto}
     * @throws ResourceNotFoundException if the user does not exist
     */
    @Audited(action = "USER_DEACTIVATED", targetType = "User", detail = "Deactivated user {0}")
    @Transactional
    public UserDto deactivateUser(UUID userId) {
        var user = requireUser(userId);
        AuditContext.captureOld(userMapper.toDto(user)); // snapshot BEFORE mutation
        user.setIsActive(false);
        var saved = userRepository.save(user);
        log.info("User deactivated: id={}, email={}", userId, user.getEmail());
        return userMapper.toDto(saved);
    }

    /**
     * Re-activates a previously deactivated user account.
     *
     * @param userId UUID of the user to activate
     * @return updated {@link UserDto}
     * @throws ResourceNotFoundException if the user does not exist
     */
    @Audited(action = "USER_ACTIVATED", targetType = "User", detail = "Activated user {0}")
    @Transactional
    public UserDto activateUser(UUID userId) {
        var user = requireUser(userId);
        AuditContext.captureOld(userMapper.toDto(user)); // snapshot BEFORE mutation
        user.setIsActive(true);
        var saved = userRepository.save(user);
        log.info("User activated: id={}, email={}", userId, user.getEmail());
        return userMapper.toDto(saved);
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    private User requireUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    private void assertEmailAvailable(String email) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("An account with this email address already exists.");
        }
    }

    private void assertStaffPhoneAvailable(String phone) {
        // Enforce uniqueness check against normalized values inside repository
        if (userRepository.existsByPhoneAndRoleNot(phone, UserRole.STUDENT)) {
            throw new IllegalArgumentException("This phone number is already assigned to another staff member.");
        }
    }

    /**
     * Builds a JPA {@link Specification} from the optional filter params.
     *
     * <p>All clauses are AND-ed together. Any null param is simply omitted
     * from the predicate so the query stays clean.
     */
    private Specification<User> buildSpec(UserRole role, String search, Boolean isActive) {
        return (root, _, cb) -> {
            var predicates = new ArrayList<Predicate>();

            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }

            if (isActive != null) {
                predicates.add(cb.equal(root.get("isActive"), isActive));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase().trim() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("firstName")), pattern),
                        cb.like(cb.lower(root.get("lastName")),  pattern),
                        cb.like(cb.lower(root.get("email")),     pattern)
                ));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}