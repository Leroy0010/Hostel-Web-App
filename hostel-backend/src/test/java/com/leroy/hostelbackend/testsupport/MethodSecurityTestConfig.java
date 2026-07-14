package com.leroy.hostelbackend.testsupport;

import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

/**
 * Minimal Spring Security configuration shared by {@code @WebMvcTest} slice
 * tests that need real {@code @PreAuthorize} enforcement on controller
 * methods.
 *
 * <p>Deliberately does <strong>not</strong> import the production
 * {@code SecurityConfig}, since that class also configures CORS, CSRF,
 * OAuth2 login, and other concerns irrelevant to a controller slice test.
 * This config instead mirrors only the two things these tests actually
 * need — {@code @EnableMethodSecurity} (so {@code @PreAuthorize} is
 * enforced) and the same 401/403 exception handling the production config
 * uses.
 *
 * <p><strong>Important:</strong> importing this config does <em>not</em>
 * keep the real {@code JwtAuthenticationFilter} out of the chain.
 * {@code JwtAuthenticationFilter} is {@code @Component}-annotated, and
 * {@code @WebMvcTest} auto-detects <em>any</em> {@code Filter}-type bean on
 * the classpath regardless of which security config is imported — so the
 * real filter is always present. Every test class using this config must
 * therefore also declare:
 * <pre>{@code
 * @MockitoBean private JwtService jwtService;
 * @MockitoBean private UserRepository userRepository;
 * }</pre>
 * purely to satisfy {@code JwtAuthenticationFilter}'s constructor — neither
 * needs to be stubbed. Every request in practice either sends no
 * {@code Authorization} header (the real filter's harmless passthrough
 * path) or is authenticated via
 * {@code SecurityMockMvcRequestPostProcessors.authentication(...)}, which
 * pre-seeds the {@code SecurityContext} before the filter chain runs — the
 * real filter's own "already authenticated, skip me" check (see
 * {@code JwtAuthenticationFilterTest}) means it never touches either mock
 * either way. This sidesteps JWT parsing entirely, which already has its
 * own dedicated coverage in {@code JwtAuthenticationFilterTest}.
 *
 * <p>Usage:
 * <pre>{@code
 * @WebMvcTest(controllers = SomeController.class)
 * @Import(MethodSecurityTestConfig.class)
 * class SomeControllerTest {
 *     @Autowired private MockMvc mockMvc;
 *     @MockitoBean private SomeService someService;
 *     @MockitoBean private JwtService jwtService;         // unstubbed — see above
 *     @MockitoBean private UserRepository userRepository; // unstubbed — see above
 *
 *     @Test
 *     void example() throws Exception {
 *         mockMvc.perform(get("/api/x")
 *                 .with(authentication(new UsernamePasswordAuthenticationToken(
 *                         new CustomUserDetails(someUser), null, someUser.getAuthorities()))))
 *             ...
 *     }
 * }
 * }</pre>
 */
@EnableMethodSecurity
public class MethodSecurityTestConfig {

    @Bean
    public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(c -> c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Mirrors the production SecurityConfig's public-read rules —
                        // needed so RoomControllerTest/HostelControllerTest exercise the
                        // actual (permitAll) behavior of these GET endpoints rather than
                        // falsely requiring authentication.
                        .requestMatchers(HttpMethod.GET, "/api/hostels").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/hostels/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/rooms").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/rooms/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(c -> c
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                        .accessDeniedHandler((req, res, ex) ->
                                res.setStatus(HttpStatus.FORBIDDEN.value())));
        return http.build();
    }
}
