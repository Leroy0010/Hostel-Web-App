package com.leroy.hostelbackend.config.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leroy.hostelbackend.shared.exception.ApiError;
import com.leroy.hostelbackend.shared.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lightweight in-memory rate limiter for brute-force-prone endpoints
 * (login, password reset, registration).
 *
 * <p><strong>Why in-memory rather than a library:</strong> the application
 * runs as a single instance on a free-tier deployment with no shared cache
 * (e.g. Redis) available. A per-IP sliding-window counter kept in a
 * {@link ConcurrentHashMap} is enough to blunt credential-stuffing and
 * registration-spam attempts without adding new infrastructure. If the app
 * is ever horizontally scaled, this should be swapped for a shared-store
 * implementation (e.g. Bucket4j + Redis) since counters here are per-JVM.
 *
 * <p><strong>Strategy:</strong> sliding window — for each client IP we keep
 * a deque of request timestamps for the current window and drop entries
 * older than {@link #WINDOW_MILLIS}. If the deque size after pruning meets
 * the configured limit for the matched path, the request is rejected with
 * {@code 429} and a {@link com.leroy.hostelbackend.shared.exception.RateLimitExceededException}-shaped
 * {@link ApiError} body, consistent with {@code GlobalExceptionHandler}'s
 * existing {@code RATE_LIMIT_EXCEEDED} handling.
 *
 * <p><strong>Registration:</strong> deliberately NOT annotated
 * {@code @Component} — a component-scanned {@code OncePerRequestFilter} gets
 * auto-detected by {@code @WebMvcTest} regardless of which security config is
 * imported (see {@code JwtAuthenticationFilter}'s Javadoc for the same
 * caveat), which would require every controller slice test to stub it out.
 * Instead this filter is instantiated directly and wired into the chain in
 * {@link com.leroy.hostelbackend.config.SecurityConfig}.
 */
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final long WINDOW_MILLIS = 60_000L; // 1 minute sliding window

    /** Path prefix → max requests per IP per window. Checked in order. */
    private static final Map<String, Integer> LIMITS = Map.of(
            "/api/auth/login", 10,
            "/api/auth/refresh", 20,
            "/api/auth/password-reset", 5,
            "/api/users", 8 // registration
    );

    private final Map<String, Deque<Long>> requestLog = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String matchedPath = matchLimitedPath(request.getRequestURI(), request.getMethod());

        if (matchedPath == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);
        String key = matchedPath + "|" + clientIp;
        int limit = LIMITS.get(matchedPath);

        if (isRateLimited(key, limit)) {
            log.warn("[RATE_LIMIT] Blocked {} from {} on {}", request.getMethod(), clientIp, matchedPath);
            writeTooManyRequests(response, request.getRequestURI());
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String matchLimitedPath(String uri, String method) {
        // Only rate-limit the write operation for registration (POST /api/users),
        // not reads that might share the same prefix in future.
        if (uri.startsWith("/api/users") && !"POST".equalsIgnoreCase(method)) {
            return null;
        }
        return LIMITS.keySet().stream()
                .filter(uri::startsWith)
                .findFirst()
                .orElse(null);
    }

    private boolean isRateLimited(String key, int limit) {
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = requestLog.computeIfAbsent(key, _ -> new ArrayDeque<>());

        synchronized (timestamps) {
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > WINDOW_MILLIS) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= limit) {
                return true;
            }
            timestamps.addLast(now);
            return false;
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void writeTooManyRequests(HttpServletResponse response, String path) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        ApiError body = new ApiError(
                LocalDateTime.now(),
                HttpStatus.TOO_MANY_REQUESTS.value(),
                HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
                "Too many requests to " + path + ". Please try again shortly.",
                null,
                ErrorCode.TOO_MANY_REQUESTS
        );

        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}