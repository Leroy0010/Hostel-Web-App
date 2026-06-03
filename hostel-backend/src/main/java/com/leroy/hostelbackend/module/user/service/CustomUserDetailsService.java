package com.leroy.hostelbackend.module.user.service;

import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.exception.UserDeactivatedException;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spring Security {@link UserDetailsService} implementation that loads a {@link com.leroy.hostelbackend.module.user.model.User}
 * by email and wraps it in a {@link CustomUserDetails} snapshot.
 *
 * <p><strong>Why {@code @Transactional(readOnly = true)}?</strong><br>
 * The transaction keeps the Hibernate session open while {@link CustomUserDetails} is
 * being constructed. Without it, accessing any lazily-loaded field on the entity after the
 * {@code findBy...} call would throw a {@code LazyInitializationException}. Using
 * {@code readOnly = true} tells Hibernate not to track dirty state, giving a small
 * performance win for a pure read operation.
 *
 * <p><strong>Deactivated accounts:</strong><br>
 * Rather than relying on {@code isEnabled()} being {@code false} and letting Spring throw
 * a generic {@code DisabledException}, we throw our own {@link UserDeactivatedException}
 * here so the {@link com.leroy.hostelbackend.shared.exception.GlobalExceptionHandler} can
 * return a meaningful {@code ErrorCode.USER_DEACTIVATED} response body.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Loads the user whose email matches {@code username} (our system uses email as the
     * login identifier).
     *
     * @param username the email address supplied in the login request
     * @return a {@link CustomUserDetails} snapshot safe to store in the security context
     * @throws UsernameNotFoundException if no account exists for that email
     * @throws UserDeactivatedException  if the account exists but has been deactivated
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(@NonNull String username) throws UsernameNotFoundException {
        var user = userRepository.findByEmailIgnoreCase(username)
                .orElseThrow(() -> {
                    // Log at DEBUG so we don't leak email addresses in production logs
                    log.debug("Authentication failed — no account found for email: {}", username);
                    // Intentionally vague message — mirrors what the controller returns
                    return new UsernameNotFoundException("Bad credentials");
                });

        if (Boolean.FALSE.equals(user.getIsActive())) {
            log.warn("Authentication attempt on deactivated account: {}", username);
            throw new UserDeactivatedException("This account has been deactivated. Please contact administration.");
        }

        return new CustomUserDetails(user);
    }
}