package com.leroy.hostelbackend.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.concurrent.Executor;

/**
 * Configuration for web push (VAPID) and the async notification thread pool.
 *
 * <p><strong>VAPID keys:</strong> Generate once with:
 * <pre>
 *   openssl ecparam -genkey -name prime256v1 -out private.pem
 *   openssl ec -in private.pem -pubout -out public.pem
 * </pre>
 * Then encode each in Base64url and set in {@code application.yml}:
 * <pre>
 *   vapid:
 *     public-key: "BG8..."
 *     private-key: "MEE..."
 *     subject: "mailto:admin@your-domain.com"
 * </pre>
 *
 * <p><strong>Thread pool:</strong> Web push calls are blocking HTTP requests.
 * Running them on a dedicated thread pool ({@code notificationExecutor}) ensures
 * booking transactions are never delayed by push delivery latency.
 */
@Configuration
@EnableAsync
@Slf4j
public class NotificationConfig {

    @Value("${vapid.public-key}")
    private String vapidPublicKey;

    @Value("${vapid.private-key}")
    private String vapidPrivateKey;

    @Value("${vapid.subject}")
    private String vapidSubject;

    /**
     * Ensure BouncyCastle is registered before the application context finishes starting.
     * The Martijn web-push library requires it to parse the VAPID EC keys.
     */
    @PostConstruct
    public void registerBouncyCastle() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
            log.info("[PUSH] BouncyCastle security provider registered");
        }
    }

    /**
     * Singleton {@link PushService} shared across all push delivery calls.
     * Keys are cleaned of surrounding whitespace/quotes to be safe across environments.
     */
    @Bean
    public PushService pushService() throws GeneralSecurityException {
        var publicKey  = vapidPublicKey.replace("\"", "").trim();
        var privateKey = vapidPrivateKey.replace("\"", "").trim();
        var subject    = vapidSubject.replace("\"", "").trim();
        return new PushService(publicKey, privateKey, subject);
    }

    /**
     * Dedicated thread pool for async push delivery.
     * Core/max pool of 4/8 threads is appropriate for a campus-scale application.
     * Increase core pool size in production if push volume is high.
     */
    @Bean(name = "notificationExecutor")
    public Executor notificationExecutor() {
        var executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("notification-");
        executor.initialize();
        return executor;
    }
}