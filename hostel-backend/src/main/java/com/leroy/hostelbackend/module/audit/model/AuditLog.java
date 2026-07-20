package com.leroy.hostelbackend.module.audit.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Immutable record of a privileged (ADMIN/MANAGER) action.
 *
 * <p>Deliberately denormalised — {@code actorId} and {@code actorRole} are
 * plain columns rather than a {@code @ManyToOne} to {@link com.leroy.hostelbackend.module.user.model.User}.
 * An audit trail must remain readable even if the acting user's account is
 * later deleted, so it should not depend on referential integrity to that row.
 *
 * <p>Rows are never updated or deleted by the application — only inserted.
 */
@Getter
@Entity
@Table(name = "audit_logs")
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** UUID of the ADMIN/MANAGER user who performed the action. */
    @Column(name = "actor_id", nullable = false)
    private UUID actorId;

    /** Role of the actor at the time of the action, e.g. "ADMIN". */
    @Column(name = "actor_role", nullable = false, length = 20)
    private String actorRole;

    /** Short machine-readable action code, e.g. "USER_DEACTIVATED". */
    @Column(name = "action", nullable = false, length = 150)
    private String action;

    /** Type of entity affected, e.g. "User", "Hostel". Nullable for global actions. */
    @Column(name = "target_type", length = 100)
    private String targetType;

    /** ID (as text) of the affected entity. Nullable for global actions. */
    @Column(name = "target_id", length = 100)
    private String targetId;

    /** Free-text human-readable detail, e.g. "Deactivated user jane@ucc.edu.gh". */
    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    /**
     * JSON snapshot of the target entity's relevant state <em>before</em> the
     * action, or {@code null} when the action has no prior state to compare
     * (e.g. creation) or no snapshot was captured.
     */
    @Column(name = "old_data", columnDefinition = "TEXT")
    private String oldData;

    /**
     * JSON snapshot of the target entity's relevant state <em>after</em> the
     * action, or {@code null} when the action has no resulting state
     * (e.g. a pure deletion).
     */
    @Column(name = "new_data", columnDefinition = "TEXT")
    private String newData;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static AuditLog of(UUID actorId, String actorRole, String action,
                              String targetType, String targetId, String detail,
                              String oldData, String newData) {
        return new AuditLog(null, actorId, actorRole, action, targetType, targetId,
                detail, oldData, newData, LocalDateTime.now());
    }
}