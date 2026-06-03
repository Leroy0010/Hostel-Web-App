package com.leroy.hostelbackend.module.user.service;

import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.user.dto.CreateStaffRequest;
import com.leroy.hostelbackend.module.user.dto.CreateStudentRequest;
import com.leroy.hostelbackend.module.user.dto.UserDto;
import com.leroy.hostelbackend.module.user.dto.UserResponse;
import com.leroy.hostelbackend.module.user.mapper.UserMapper;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.model.UserRole;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Application service for user account management.
 *
 * <p>Two creation flows exist:
 * <ol>
 *   <li><strong>Student self-registration</strong> — open endpoint, no auth required,
 *       always assigns {@link UserRole#STUDENT}.</li>
 *   <li><strong>Admin-created staff</strong> — secured endpoint ({@code ROLE_ADMIN}
 *       only), assigns {@link UserRole#MANAGER} or {@link UserRole#ADMIN}.
 *       Phone number is mandatory for staff accounts.</li>
 * </ol>
 *
 * <p>Duplicate email detection is done with {@code existsByEmailIgnoreCase} which
 * issues a lightweight {@code COUNT} query rather than loading the full entity.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final BookingRepository bookingRepository;

    // -------------------------------------------------------------------------
    // Student self-registration
    // -------------------------------------------------------------------------

    /**
     * Registers a new student account. Open to unauthenticated callers.
     *
     * @param request validated registration request
     * @return the created user as a {@link UserDto}
     * @throws IllegalArgumentException if the email is already in use
     */
    @Transactional
    public UserDto registerStudent(CreateStudentRequest request) {
        assertEmailAvailable(request.getEmail());

        var user = createNewUser(request.getEmail(), request.getPassword(), request.getFirstName(), request.getLastName(), request.getPhone());
        user.setRole(UserRole.STUDENT);  // always STUDENT — never trust the client

        var saved = userRepository.save(user);
        log.info("New student account created: id={}, email={}", saved.getId(), saved.getEmail());
        return userMapper.toDto(saved);
    }


    // -------------------------------------------------------------------------
    // Admin creates staff (MANAGER or ADMIN)
    // -------------------------------------------------------------------------

    /**
     * Creates a new MANAGER or ADMIN account. Callable only by authenticated ADMINs.
     * The role guard ({@code @PreAuthorize}) is applied at the controller level.
     *
     * @param request validated staff creation request
     * @return the created user as a {@link UserDto}
     * @throws IllegalArgumentException if the email is already in use, or if the
     *                                  requested role is {@link UserRole#STUDENT}
     *                                  (students self-register)
     */
    @Transactional
    public UserDto createStaff(CreateStaffRequest request) {
        // Guard: admins cannot use this endpoint to create a student account.
        // Students self-register via registerStudent() — mixing both paths would
        // bypass the "phone required for staff" rule.
        if (request.getRole().equals(UserRole.STUDENT)) {
            throw new IllegalArgumentException(
                    "Use the student registration endpoint to create student accounts."
            );
        }

        assertEmailAvailable(request.getEmail());

        var user = createNewUser(request.getEmail(), request.getPassword(), request.getFirstName(), request.getLastName(), request.getPhone());
        user.setRole(request.getRole());
        var saved = userRepository.save(user);
        log.info("Staff account created: id={}, email={}, role={}", saved.getId(), saved.getEmail(), saved.getRole());
        return userMapper.toDto(saved);
    }

    public UserResponse me(UUID id) {
        var user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", id));
        var bookings = bookingRepository.findCurrentByUserId((id));
        var booking = bookings.isEmpty() ? null : bookings.getFirst();
        return userMapper.toResponse(user, booking);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private @NonNull User createNewUser(String email, String password, String firstName, String lastName, String phone) {
        var user = new User();
        user.setEmail(email.toLowerCase().trim());
        user.setPassword(passwordEncoder.encode(password));
        user.setFirstName(firstName.trim());
        user.setLastName(lastName.trim());
        user.setPhone(phone);
        user.setIsActive(true);
        return user;
    }

    /**
     * Checks whether the supplied email is already registered. Uses the lightweight
     * {@code EXISTS} query rather than fetching the full entity.
     *
     * @param email the email to check
     * @throws IllegalArgumentException with a user-facing message if already taken
     */
    private void assertEmailAvailable(String email) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("An account with this email address already exists.");
        }
    }
}