package com.leroy.hostelbackend.module.notification.repository;

import com.leroy.hostelbackend.module.notification.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /** Paginated notification centre feed — newest first, excludes soft-deleted. */
    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(
            UUID recipientId, Pageable pageable);

    /** Unread badge count. */
    long countByRecipientIdAndIsReadFalse(UUID recipientId);

    /** Mark a single notification as read. Scoped to the owner for safety. */
    @Modifying
    @Query("""
            UPDATE Notification n
            SET n.isRead = true, n.readAt = :now
            WHERE n.id = :id AND n.recipient.id = :userId AND n.isRead = false
            """)
    void markOneAsRead(@Param("id") UUID id, @Param("userId") UUID userId,
                       @Param("now") LocalDateTime now);

    /** Mark all unread notifications as read for a user. */
    @Modifying
    @Query("""
            UPDATE Notification n
            SET n.isRead = true, n.readAt = :now
            WHERE n.recipient.id = :userId AND n.isRead = false
            """)
    void markAllAsRead(@Param("userId") UUID userId, @Param("now") LocalDateTime now);

}