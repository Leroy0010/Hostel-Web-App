package com.leroy.hostelbackend.module.user.service;

import com.leroy.hostelbackend.module.auth.dto.LoginResponse;
import com.leroy.hostelbackend.module.auth.mapper.AuthMapper;
import com.leroy.hostelbackend.module.auth.model.AuthTokenType;
import com.leroy.hostelbackend.module.auth.security.JwtService;
import com.leroy.hostelbackend.module.auth.service.AuthService;
import com.leroy.hostelbackend.module.booking.repository.BookingRepository;
import com.leroy.hostelbackend.module.email.service.EmailService;
import com.leroy.hostelbackend.module.user.dto.*;
import com.leroy.hostelbackend.module.user.mapper.UserMapper;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.model.UserRole;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final BookingRepository bookingRepository;
    private final EmailService emailService;
    private final AuthService authService; // Injected to handle token workflows
    private final JwtService jwtService;
    private final AuthMapper authMapper;

    @Transactional
    public LoginResponse registerStudent(CreateStudentRequest request, HttpServletResponse response) {
        assertEmailAvailable(request.getEmail());

        // Set to false initially — student must verify email before logging in
        var user = User.create(request.getEmail(), request.getFirstName(), request.getLastName(), request.getPhone(), false);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.STUDENT);

        var saved = userRepository.save(user);

        var accessToken  = jwtService.generateAccessToken(saved);
        var refreshToken = jwtService.generateRefreshToken(saved);

        // HttpOnly + Secure cookie — never readable by JavaScript
        authService.setAuthCookie(response, refreshToken.toString());

        var userResponse = userMapper.toResponse(user, null);

        // Generate security token and trigger email asynchronously
        String rawToken = authService.createEmailVerificationToken(saved);
        emailService.sendStudentVerificationEmail(saved.getEmail(), user.getName(), rawToken);

        log.info("New student account created (Pending Verification): id={}, email={}", saved.getId(), saved.getEmail());
        return authMapper.toLoginResponse(userResponse, accessToken.toString());
    }

    @Transactional
    public UserDto createStaff(CreateStaffRequest request) {
        if (request.getRole().equals(UserRole.STUDENT)) {
            throw new IllegalArgumentException("Use the student registration endpoint to create student accounts.");
        }

        assertEmailAvailable(request.getEmail());

        // Admin-created staff can also start as inactive until they set up via the emailed link
        var user = User.create(request.getEmail(), request.getFirstName(), request.getLastName(), request.getPhone(), false);
        user.setRole(request.getRole());
        var saved = userRepository.save(user);

        String rawToken = authService.generateAndSaveToken(user, AuthTokenType.PASSWORD_RESET, 24 * 60);

        emailService.sendStaffActivationEmail(saved.getEmail(), user.getName(), rawToken);

        log.info("Staff account created (Pending Activation): id={}, email={}, role={}", saved.getId(), saved.getEmail(), saved.getRole());
        return userMapper.toDto(saved);
    }

    public UserResponse me(UUID id) {
        var user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", id));
        var bookings = bookingRepository.findCurrentByUserId((id));
        var booking = bookings.isEmpty() ? null : bookings.getFirst();
        return userMapper.toResponse(user, booking);
    }

    /**
     * Updates the user's profile details.
     *
     * @param userId  The ID of the currently authenticated user
     * @param request The updated profile payload
     */
    @Transactional
    public void updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Update fields safely
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());

        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        } else {
            user.setPhone(null);
        }

        userRepository.save(user);
    }


    private void assertEmailAvailable(String email) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("An account with this email address already exists.");
        }
    }
}