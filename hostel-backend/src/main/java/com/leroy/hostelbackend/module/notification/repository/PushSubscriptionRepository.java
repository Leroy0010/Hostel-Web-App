package com.leroy.hostelbackend.module.notification.repository;

import com.leroy.hostelbackend.module.notification.model.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, UUID> {

    /** All active subscriptions for a user — used during push delivery. */
    List<PushSubscription> findByUserIdAndIsActiveTrue(UUID userId);

    /** Look up by endpoint for upsert logic on subscription registration. */
    Optional<PushSubscription> findByEndpoint(String endpoint);
}