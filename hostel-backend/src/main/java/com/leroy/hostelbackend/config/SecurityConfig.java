package com.leroy.hostelbackend.config;

import com.leroy.hostelbackend.module.auth.security.JwtAuthenticationFilter;
import com.leroy.hostelbackend.module.user.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Duration;
import java.util.List;

/**
 * Spring Security configuration.
 *
 * <p>Key decisions:
 * <ul>
 *   <li><strong>Stateless sessions</strong> — JWT carries authentication state; no
 *       {@code HttpSession} is created or used.</li>
 *   <li><strong>{@code CustomUserDetailsService}</strong> replaces the old {@code UserService}
 *       so that the security context principal is a {@link com.leroy.hostelbackend.module.user.model.CustomUserDetails}
 *       instance rather than Spring's bare {@code User} object.</li>
 *   <li><strong>{@code @EnableMethodSecurity}</strong> activates {@code @PreAuthorize}
 *       on controller methods (e.g. {@code @PreAuthorize("hasRole('ADMIN')")}) without
 *       needing to declare every rule here in the filter chain.</li>
 *   <li><strong>CSRF disabled</strong> — stateless REST APIs with JWT do not need CSRF
 *       protection because cookies are not used to carry authentication credentials
 *       (the refresh-token cookie is {@code HttpOnly} and only sent to {@code /auth/refresh}).</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Switch from setAllowedOriginPatterns to setAllowedOrigins for iOS stability
        configuration.setAllowedOrigins(List.of(
                frontendBaseUrl,
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://192.168.0.101:5173"
        ));

        // Allow all HTTP methods including PATCH
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));

        // Explicitly allow common headers including Content-Type
        configuration.setAllowedHeaders(List.of("Accept", "Accept-Language", "Content-Language", "Content-Type", "Authorization", // CRITICAL for JWT
                "X-Requested-With", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers", "Cache-Control", "Pragma", "Expires", "Last-Modified", "If-Modified-Since", "X-XSRF-TOKEN"));

        // Allow credentials (necessary if you are using cookies/session, but still safe for JWT)
        configuration.setAllowCredentials(Boolean.TRUE);

        // Expose headers
        configuration.setExposedHeaders(List.of("X-XSRF-TOKEN", "Access-Control-Allow-Origin", "Access-Control-Allow-Credentials", "Access-Control-Allow-Headers", "Access-Control-Allow-Methods"));

        // Cache preflight for 1 hour
        configuration.setMaxAge(Duration.ofDays(3600L));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) {
        http
                .sessionManagement(c -> c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(AbstractHttpConfigurer::disable)
                // CORS configuration
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(c -> c
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                        // Student self-registration — open to everyone
                        .requestMatchers(HttpMethod.POST, "/api/users").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        // Auth endpoints — open to everyone
                        // Inside your SecurityConfig.java securityFilterChain definition:
                        .requestMatchers("/api/auth/login", "/api/auth/refresh").permitAll()
                        .requestMatchers("/api/auth/verify-email").permitAll() // Allow anonymous access
                        .requestMatchers("/api/auth/password-reset/**").permitAll() // Allow anonymous access
                        // Swagger / OpenAPI docs — open in dev; restrict in prod via profiles
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/hostels").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/hostels/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/landmarks/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/wss/**").permitAll()
                        // Everything else requires a valid JWT
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(c -> c
                        // Return 401 JSON (not a redirect to a login page) for missing/invalid tokens
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                        // Return 403 JSON for authenticated but unauthorised requests
                        .accessDeniedHandler((_, res, _) -> res.setStatus(HttpStatus.FORBIDDEN.value()))
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt strength 12 — good balance of security and performance
        return new BCryptPasswordEncoder(12);
    }

    /**
     * Wires {@link CustomUserDetailsService} and {@link PasswordEncoder} into the
     * {@link DaoAuthenticationProvider} used by the {@link AuthenticationManager}.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        var provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) {
        return config.getAuthenticationManager();
    }
}