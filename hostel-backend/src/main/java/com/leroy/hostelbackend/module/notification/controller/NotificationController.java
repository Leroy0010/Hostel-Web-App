package com.leroy.hostelbackend.module.notification.controller;

import com.leroy.hostelbackend.module.notification.dto.NotificationResponse;
import com.leroy.hostelbackend.module.notification.dto.PushSubscriptionRequest;
import com.leroy.hostelbackend.module.notification.dto.UnsubscribeRequest;
import com.leroy.hostelbackend.module.notification.service.NotificationService;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import com.leroy.hostelbackend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * REST controller for the notification centre and push subscriptions.
 *
 * <p>Endpoint summary:
 * <pre>
 * GET    /notifications             → paginated notification feed
 * GET    /notifications/unread-count → badge count
 * PATCH  /notifications/{id}/read  → mark one as read
 * PATCH  /notifications/read-all   → mark all as read
 * DELETE /notifications/{id}       → soft-delete one notification
 * POST   /notifications/push/subscribe   → register browser push subscription
 * DELETE /notifications/push/unsubscribe → remove push subscription
 * GET    /notifications/vapid-public-key → send public key to frontend (needed for subscribe)
 * </pre>
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService notificationService;

    /** Full notification feed — newest first. */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> myNotifications(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var userId = customUserDetails.getUserId();
        return ResponseEntity.ok(ApiResponse.success("Notifications fetched.",
                notificationService.getMyNotifications(userId, pageable)));
    }

    /** Bell badge count — unread notifications only. */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(@AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var userId = customUserDetails.getUserId();
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(ApiResponse.success("Unread count fetched.", Map.of("count", count)));
    }

    /** Mark a single notification as read (auto-called when the user opens it). */
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markOneRead(@PathVariable UUID id, @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var userId = customUserDetails.getUserId();
        notificationService.markOneAsRead(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read."));
    }

    /** Mark all unread notifications as read. */
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead(@AuthenticationPrincipal CustomUserDetails customUserDetails) {
        var userId = customUserDetails.getUserId();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read."));
    }

    /** Soft-delete — hides the notification from the feed without deleting the row. */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable UUID id) {
        notificationService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Notification dismissed."));
    }

    // -------------------------------------------------------------------------
    // Push subscription endpoints
    // -------------------------------------------------------------------------

    /**
     * Returns the VAPID public key so the frontend can call
     * {@code pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })}.
     */
    @GetMapping("/vapid-public-key")
    public ResponseEntity<ApiResponse<Map<String, String>>> vapidPublicKey(
            @org.springframework.beans.factory.annotation.Value("${vapid.public-key}") String publicKey
    ) {
        return ResponseEntity.ok(ApiResponse.success("VAPID public key.",
                Map.of("publicKey", publicKey.replace("\"", "").trim())));
    }

    /**
     * Registers a browser push subscription.
     * Called by the frontend immediately after the user grants push permission.
     */
    @PostMapping("/push/subscribe")
    public ResponseEntity<ApiResponse<Void>> subscribe(
            @Valid @RequestBody PushSubscriptionRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var userId = customUserDetails.getUserId();
        notificationService.savePushSubscription(request, userId);
        return ResponseEntity.ok(ApiResponse.success("Push subscription registered."));
    }

    /**
     * Removes a browser push subscription (logout or permission revoked).
     */
    @DeleteMapping("/push/unsubscribe")
    public ResponseEntity<ApiResponse<Void>> unsubscribe(
            @Valid @RequestBody UnsubscribeRequest request,
            @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        var userId = customUserDetails.getUserId();
        notificationService.removePushSubscription(request.endpoint(), userId);
        return ResponseEntity.ok(ApiResponse.success("Push subscription removed."));
    }
}