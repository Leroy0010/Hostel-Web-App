package com.leroy.hostelbackend.config;

import com.leroy.hostelbackend.module.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

/**
 * STOMP over WebSocket configuration.
 *
 * <p><strong>Flow:</strong>
 * <pre>
 *   Client connects → /ws (SockJS fallback enabled)
 *   Client subscribes → /user/queue/notifications   (private per-user topic)
 *   Client subscribes → /topic/hostel/{id}          (broadcast e.g. new complaints)
 *   Server sends to user → messagingTemplate.convertAndSendToUser(userId, "/queue/notifications", payload)
 * </pre>
 *
 * <p><strong>Authentication:</strong> JWT is validated on the STOMP CONNECT frame via
 * {@link JwtChannelInterceptor}. Spring's {@code DefaultHandshakeHandler} does NOT
 * integrate with Spring Security out of the box for WebSockets — the interceptor
 * approach is the correct pattern for stateless JWT auth.
 *
 * <p><strong>SockJS:</strong> Enabled so browsers that don't support native WebSocket
 * (or are behind restrictive proxies) fall back to HTTP long-polling. The React
 * frontend uses the {@code @stomp/stompjs} client which handles this automatically.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;

    @Value("${app.frontend.base-url}")
    private String frontendUrl;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // In-memory broker handles /topic (broadcast) and /user (point-to-point)
        registry.enableSimpleBroker("/topic", "/queue");

        // Client-to-server messages are prefixed with /app
        registry.setApplicationDestinationPrefixes("/app");

        // /user/{userId}/queue/... routing prefix
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(frontendUrl);
    }

    /**
     * Intercepts the STOMP CONNECT frame to authenticate the JWT.
     * Extracts the Bearer token from the {@code Authorization} STOMP header,
     * validates it, and sets a {@link UsernamePasswordAuthenticationToken} as
     * the session user so Spring's {@code /user/...} routing resolves correctly.
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new JwtChannelInterceptor(jwtService));
    }

    // -------------------------------------------------------------------------
    // Inner interceptor — kept here to avoid a separate file for a single class
    // -------------------------------------------------------------------------

    @RequiredArgsConstructor
    @Slf4j
    static class JwtChannelInterceptor implements ChannelInterceptor {

        private final JwtService jwtService;

        @Override
        public Message<?> preSend(Message<?> message, MessageChannel channel) {
            var accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

            if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                var authHeader = accessor.getFirstNativeHeader("Authorization");

                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    var token = authHeader.substring(7);
                    var jwt   = jwtService.parseToken(token);

                    if (jwt != null && !jwt.isExpired()) {
                        var userId = jwt.getUserId().toString();
                        var role   = jwt.getRole().name();

                        // Set principal — this is what convertAndSendToUser() uses to route
                        var auth = new UsernamePasswordAuthenticationToken(
                                userId, null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        );
                        accessor.setUser(auth);
                        log.debug("[WS] Authenticated STOMP CONNECT: userId={}", userId);
                    } else {
                        log.warn("[WS] STOMP CONNECT rejected — invalid or expired JWT");
                        // Returning the message without a user set causes Spring to reject the connection
                    }
                }
            }
            return message;
        }
    }
}