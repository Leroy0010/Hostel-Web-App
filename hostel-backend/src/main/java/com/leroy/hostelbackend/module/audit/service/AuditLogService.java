package com.leroy.hostelbackend.module.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leroy.hostelbackend.module.audit.model.AuditLog;
import com.leroy.hostelbackend.module.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Records and retrieves the audit trail of privileged (ADMIN/MANAGER) actions.
 *
 * <p><strong>Design note:</strong> {@link #record} runs in its own
 * {@code REQUIRES_NEW} transaction so that an audit-write failure (or a
 * failure elsewhere after the audit row is written) never rolls back —
 * and never blocks — the primary business operation it is documenting.
 * A missing audit row is preferable to a failed admin action.
 *
 * <p><strong>Old/new data:</strong> callers may pass a before/after snapshot
 * of the affected entity (typically its DTO) — these are serialised to JSON
 * and stored as-is. Passing {@code null} for either is fine and expected for
 * actions that have no "before" (creation) or no "after" (deletion) state.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    /** Low-level entry point — old/new data already serialised (or null). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID actorId, String actorRole, String action,
                       String targetType, String targetId, String detail,
                       String oldData, String newData) {
        try {
            auditLogRepository.save(
                    AuditLog.of(actorId, actorRole, action, targetType, targetId,
                            detail, oldData, newData));
        } catch (Exception ex) {
            // Never let audit logging break the action it's documenting.
            log.error("[AUDIT] Failed to record audit log: action={}, actorId={}", action, actorId, ex);
        }
    }

    /**
     * Convenience overload — serialises {@code oldValue}/{@code newValue}
     * (typically DTOs) to JSON before delegating to {@link #record}.
     * Either may be {@code null}.
     */
    public void record(UUID actorId, String actorRole, String action,
                       String targetType, String targetId, String detail,
                       Object oldValue, Object newValue) {
        record(actorId, actorRole, action, targetType, targetId, detail,
                toJson(oldValue), toJson(newValue));
    }

    /** Backward-compatible overload for actions with no before/after snapshot. */
    public void record(UUID actorId, String actorRole, String action,
                       String targetType, String targetId, String detail) {
        record(actorId, actorRole, action, targetType, targetId, detail, (String) null, null);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> list(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            log.warn("[AUDIT] Failed to serialise audit snapshot of type {}: {}",
                    value.getClass().getSimpleName(), ex.getMessage());
            return null;
        }
    }
}