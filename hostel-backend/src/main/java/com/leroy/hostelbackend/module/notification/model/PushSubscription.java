package com.leroy.hostelbackend.module.notification.model;

import com.leroy.hostelbackend.module.user.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A browser push subscription registered by a user.
 *
 * <p>When a user grants push permission in the browser, the frontend calls
 * {@code POST /notifications/push/subscribe} with the subscription object
 * returned by the Push API. We store it here so the server can send
 * push messages via the Martijn VAPID library even when the tab is closed.
 *
 * <p>Multiple subscriptions per user are supported (different browsers/devices).
 * Inactive subscriptions ({@code isActive = false}) are retained for auditing
 * but skipped during push delivery.
 */
@Getter
@Setter
@Entity
@Table(name = "push_subscriptions")
public class PushSubscription {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Browser push endpoint URL — unique per subscription. */
    @Column(name = "endpoint", nullable = false, unique = true, columnDefinition = "TEXT")
    private String endpoint;

    /** Client EC public key (Base64url) used for payload encryption. */
    @Column(name = "p256dh", nullable = false, columnDefinition = "TEXT")
    private String p256dh;

    /** Shared authentication secret (Base64url). */
    @Column(name = "auth", nullable = false, columnDefinition = "TEXT")
    private String auth;

    /** User-Agent string — useful for diagnosing delivery failures per browser. */
    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    /**
     * {@code false} if the push service returned 404/410 (subscription expired).
     * Expired subscriptions are marked inactive rather than deleted so auditing is preserved.
     */
    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}