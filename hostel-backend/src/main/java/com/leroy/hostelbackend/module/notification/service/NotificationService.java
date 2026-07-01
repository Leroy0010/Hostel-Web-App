package com.leroy.hostelbackend.module.notification.service;

import com.leroy.hostelbackend.module.notification.dto.NotificationResponse;
import com.leroy.hostelbackend.module.notification.dto.PushSubscriptionRequest;
import com.leroy.hostelbackend.module.notification.mapper.NotificationMapper;
import com.leroy.hostelbackend.module.notification.model.NotificationType;
import com.leroy.hostelbackend.module.notification.model.PushSubscription;
import com.leroy.hostelbackend.module.notification.repository.NotificationRepository;
import com.leroy.hostelbackend.module.notification.repository.PushSubscriptionRepository;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.repository.UserRepository;
import com.leroy.hostelbackend.shared.exception.ResourceNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Central notification dispatcher.
 *
 * <p><strong>Three-layer delivery:</strong>
 * <ol>
 *   <li><strong>Persist</strong> — row in {@code notifications} table (notification centre).</li>
 *   <li><strong>STOMP WebSocket</strong> — live push to {@code /user/{userId}/queue/notifications}
 *       for open browser tabs. Non-blocking; no-op if user is offline.</li>
 *   <li><strong>Web Push (VAPID)</strong> — background push via Martijn library for
 *       offline/closed-tab delivery. Runs {@code @Async} so it never blocks a booking
 *       transaction.</li>
 * </ol>
 *
 * <p><strong>How callers use this:</strong>
 * <pre>
 *   notificationService.notify(
 *       recipient,
 *       "Booking Approved",
 *       "Your booking for Room 101 has been approved.",
 *       "BOOKING_APPROVED",
 *       "BOOKING", bookingId,
 *       "/bookings/" + bookingId
 *   );
 * </pre>
 *
 * <p>This is called from {@code BookingService} and {@code WaitlistService}.
 * The push notification work happens on a separate thread so it never adds
 * latency to the booking transaction.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository     notificationRepository;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final UserRepository             userRepository;
    private final NotificationMapper         notificationMapper;
    private final SimpMessagingTemplate      messagingTemplate;
    private final PushService                pushService;     // configured in NotificationConfig
    private final   ObjectMapper               objectMapper;


    // -------------------------------------------------------------------------
    // Core dispatch
    // -------------------------------------------------------------------------

    /**
     * Persists, broadcasts via WebSocket, and dispatches a web push (async).
     *
     * @param recipient   the user to notify
     * @param title       short heading shown in the bell menu
     * @param message     longer body text
     * @param type        one of: BOOKING_APPROVED | BOOKING_REJECTED | BOOKING_CANCELLED |
     *                    CHECKIN_REMINDER | WAITLIST_PROMOTED | COMPLAINT_UPDATED | GENERAL
     * @param entityType  "BOOKING" | "COMPLAINT" | "REVIEW" | null
     * @param entityId    UUID of the related entity for deep-linking, or null
     * @param navigateUrl frontend path e.g. "/bookings/abc123"
     */

    @Transactional
    public void notify(User recipient, String title, String message,
                       NotificationType type, String entityType, UUID entityId, String navigateUrl) {

        // 1. Persist
        var entity = new com.leroy.hostelbackend.module.notification.model.Notification();
        entity.setRecipient(recipient);
        entity.setTitle(title);
        entity.setMessage(message);
        entity.setType(type);
        entity.setEntityType(entityType);
        entity.setEntityId(entityId);
        entity.setNavigateUrl(navigateUrl);
        var saved = notificationRepository.save(entity);

        var response = notificationMapper.toResponse(saved);

        // 2. STOMP WebSocket — live delivery (non-blocking; no-op if offline)
        try {
            messagingTemplate.convertAndSendToUser(
                    recipient.getId().toString(),
                    "/queue/notifications",
                    response
            );
            log.debug("[WS] Notification sent to user {}: type={}", recipient.getId(), type);
        } catch (Exception e) {
            // Never let WebSocket failure block the calling transaction
            log.warn("[WS] Failed to deliver WebSocket notification to {}: {}", recipient.getId(), e.getMessage());
        }

        // 3. Web push — @Async, runs on a separate thread
        sendWebPushAsync(recipient.getId(), response);
    }

    // -------------------------------------------------------------------------
    // Convenience factory methods — reduce boilerplate in callers
    // -------------------------------------------------------------------------

    public void notifyBookingRejected(User student, UUID bookingId, String reason) {
        notify(student, "Booking Rejected",
                "Your booking request was rejected. Reason: " + reason,
                NotificationType.BOOKING_REJECTED, "BOOKING", bookingId, "/bookings/" + bookingId);
    }

    public void notifyBookingCancelled(User student, UUID bookingId) {
        notify(student, "Booking Cancelled",
                "Your booking has been cancelled.",
                NotificationType.BOOKING_CANCELLED, "BOOKING", bookingId, "/bookings/" + bookingId);
    }

    public void notifyCheckedIn(User student, UUID bookingId) {
        notify(student, "Checked In",
                "You have been successfully checked in. Welcome!",
                NotificationType.CHECKIN_REMINDER, "BOOKING", bookingId, "/bookings/" + bookingId);
    }

    public void notifyCheckedOut(User student, UUID bookingId) {
        notify(student, "Checked Out",
                "You have been checked out. We hope you had a great stay!",
                NotificationType.GENERAL, "BOOKING", bookingId, "/bookings/" + bookingId);
    }

    public void notifyWaitlistPromoted(User student, UUID hostelId) {
        notify(student, "Waitlist Update",
                "A bed has become available at a hostel you are waiting for. Book now before it fills up!",
                NotificationType.WAITLIST_PROMOTED, "HOSTEL", hostelId, "/hostels/" + hostelId);
    }

    public void notifyComplaintUpdated(User student, UUID complaintId, String newStatus) {
        notify(student, "Complaint Updated",
                "Your complaint status has been updated to: " + newStatus + ".",
                NotificationType.COMPLAINT_UPDATED, "COMPLAINT", complaintId, "/complaints/" + complaintId);
    }

    // -------------------------------------------------------------------------
    // New factory methods for the flexible booking flow
    // -------------------------------------------------------------------------

    public void notifyBookingApproved(User student, UUID bookingId, int gracePeriodHours) {
        notify(student, "Booking Approved",
                "Your booking request has been approved. Please submit your payment reference within " + gracePeriodHours + " hours to secure your bed.",
                NotificationType.BOOKING_APPROVED, "BOOKING", bookingId, "/bookings/" + bookingId);
    }

    public void notifyBookingExpired(User student, UUID bookingId) {
        notify(student, "Booking Expired",
                "Your approved booking has expired because the payment reference was not submitted in time. The bed has been released.",
                NotificationType.BOOKING_CANCELLED, "BOOKING", bookingId, "/bookings/" + bookingId);
    }

    public void notifyOtherActiveBookingsReminder(UUID studentId, int activeCount) {
        // We use a null entityId/navigateUrl here since it points to the general list,
        // or you can point it to a "/bookings/my-bookings" route.
        User student = userRepository.findById(studentId).orElseThrow();
        notify(student, "Pending Bookings Reminder",
                "You have successfully checked in, but you still have " + activeCount + " other active(pending/approved) booking request(s). Please cancel them if they are no longer needed.",
                NotificationType.GENERAL, null, null, "/student/bookings/my");
    }

    public void notifyManagerNewBookingRequest(User manager, String studentName, String roomNumber, UUID bookingId) {
        notify(manager, "New Booking Request",
                "Student " + studentName + " has requested room " + roomNumber + ". Review the request.",
                NotificationType.GENERAL, "BOOKING", bookingId, "/bookings/" + bookingId);
    }

    public void notifyManagerPaymentSubmitted(User manager, String studentName, String roomNumber, UUID bookingId) {
        notify(manager, "Payment Reference Received",
                "Student " + studentName + " has submitted payment details for room " + roomNumber + ". Ready for verification.",
                NotificationType.GENERAL, "BOOKING", bookingId, "/bookings/" + bookingId);
    }

    // -------------------------------------------------------------------------
    // Push subscription management
    // -------------------------------------------------------------------------

    /**
     * Registers or updates a browser push subscription.
     * Upserts on {@code endpoint} — if the endpoint exists, keys are refreshed
     * and the subscription is re-activated.
     */
    @Transactional
    public void savePushSubscription(PushSubscriptionRequest request, UUID userId) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        pushSubscriptionRepository.findByEndpoint(request.endpoint())
                .ifPresentOrElse(existing -> {
                    existing.setP256dh(request.p256dh());
                    existing.setAuth(request.auth());
                    existing.setActive(true);
                    if (request.userAgent() != null) existing.setUserAgent(request.userAgent());
                    pushSubscriptionRepository.save(existing);
                }, () -> {
                    var sub = new PushSubscription();
                    sub.setUser(user);
                    sub.setEndpoint(request.endpoint());
                    sub.setP256dh(request.p256dh());
                    sub.setAuth(request.auth());
                    sub.setUserAgent(request.userAgent());
                    pushSubscriptionRepository.save(sub);
                });
        log.debug("[PUSH] Subscription registered for user {}", userId);
    }

    /** Deactivates a subscription (user revoked permission or logged out). */
    @Transactional
    public void removePushSubscription(String endpoint, UUID userId) {
        pushSubscriptionRepository.findByEndpoint(endpoint)
                .filter(sub -> sub.getUser().getId().equals(userId))
                .ifPresent(sub -> {
                    sub.setActive(false);
                    pushSubscriptionRepository.save(sub);
                });
    }

    // -------------------------------------------------------------------------
    // Notification centre (read operations)
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(UUID userId, Pageable pageable) {
        return notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(userId, pageable)
                .map(notificationMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markOneAsRead(UUID notificationId, UUID userId) {
        notificationRepository.markOneAsRead(notificationId, userId, LocalDateTime.now());
        broadcastUnreadCount(userId);
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsRead(userId, LocalDateTime.now());
        broadcastUnreadCount(userId);
    }

    @Transactional
    public void delete(UUID notificationId) {
        var notification = notificationRepository.findById(notificationId).orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));
        notificationRepository.delete(notification);
        broadcastUnreadCount(notification.getRecipient().getId());
    }

    // -------------------------------------------------------------------------
    // Async web push delivery
    // -------------------------------------------------------------------------

    /**
     * Delivers a web push notification to all active subscriptions for the user.
     * Runs {@code @Async} — never blocks the calling transaction.
     * Subscriptions that return 404/410 are automatically deactivated.
     */
    @Async("notificationExecutor")
    public void sendWebPushAsync(UUID userId, NotificationResponse response) {
        var subscriptions = pushSubscriptionRepository.findByUserIdAndIsActiveTrue(userId);
        if (subscriptions.isEmpty()) return;

        String payload;
        try {
            payload = objectMapper.writeValueAsString(Map.of(
                    "title",       response.title(),
                    "message",     response.message(),
                    "type",        response.type(),
                    "navigateUrl", response.navigateUrl() != null ? response.navigateUrl() : "",
                    "id",          response.id().toString()
            ));
        } catch (Exception e) {
            log.error("[PUSH] Failed to serialise push payload for user {}: {}", userId, e.getMessage());
            return;
        }

        byte[] payloadBytes = payload.getBytes(StandardCharsets.UTF_8);

        for (var sub : subscriptions) {
            try {
                var pushNotification = new Notification(
                        sub.getEndpoint(),
                        sub.getP256dh(),
                        sub.getAuth(),
                        payloadBytes
                );

                var httpResponse = pushService.send(pushNotification, Encoding.AES128GCM);
                int status       = httpResponse.getStatusLine().getStatusCode();

                if (status == 201) {
                    log.debug("[PUSH] Delivered to user={}, endpoint={}", userId, sub.getEndpoint());
                } else if (status == 404 || status == 410) {
                    log.warn("[PUSH] Subscription expired ({}). Deactivating endpoint={}", status, sub.getEndpoint());
                    sub.setActive(false);
                    pushSubscriptionRepository.save(sub);
                } else {
                    log.error("[PUSH] Push rejected status={} for endpoint={}", status, sub.getEndpoint());
                }
            } catch (Exception e) {
                log.error("[PUSH] Exception delivering push to endpoint={}: {}", sub.getEndpoint(), e.getMessage());
            }
        }
    }

    // -------------------------------------------------------------------------
    // Real-Time Count Sync
    // -------------------------------------------------------------------------

    /**
     * Broadcasts the exact unread count to the user's active WebSocket sessions.
     */
    private void broadcastUnreadCount(UUID userId) {
        long count = notificationRepository.countByRecipientIdAndIsReadFalse(userId);
        try {
            messagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    "/queue/unread-count",
                    Map.of("count", count)
            );
        } catch (Exception e) {
            log.warn("[WS] Failed to broadcast unread count to {}: {}", userId, e.getMessage());
        }
    }
}