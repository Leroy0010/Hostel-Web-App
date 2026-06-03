package com.leroy.hostelbackend.module.notification.model;

import com.leroy.hostelbackend.module.user.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Persisted notification record.
 *
 * <p>Delivery pipeline (all triggered by {@link com.leroy.hostelbackend.module.notification.service.NotificationService#notify}):
 * <ol>
 *   <li>Row inserted here for the notification centre (persistent history).</li>
 *   <li>STOMP broadcast to {@code /user/{userId}/queue/notifications} if
 *       the user has an active WebSocket session.</li>
 *   <li>Web push via Martijn VAPID library if the user has a registered
 *       {@link PushSubscription} (handles offline/background delivery).</li>
 * </ol>
 *
 * <p>{@code refId} is a loose FK to the related domain entity (booking UUID,
 * complaint UUID, etc.) so the frontend can deep-link from the bell menu.
 *
 * <p>Soft-delete via {@code isDeleted} so users can "dismiss" notifications
 * without losing audit history.
 */
@Getter
@Setter
@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** The user who should receive this notification. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;


    @Column(name = "type", nullable = false)
    @Enumerated(EnumType.STRING)
    private NotificationType type;

    /** e.g. "BOOKING", "COMPLAINT" — lets the frontend know which entity to fetch. */
    @Column(name = "entity_type")
    private String entityType;

    /** UUID of the related booking, complaint, etc. for deep-linking. */
    @Column(name = "entity_id")
    private UUID entityId;

    /** Frontend navigation path — e.g. "/bookings/abc123". */
    @Column(name = "navigate_url")
    private String navigateUrl;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

}