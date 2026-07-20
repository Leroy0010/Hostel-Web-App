package com.leroy.hostelbackend.module.audit.dto;

import com.leroy.hostelbackend.module.audit.model.AuditLog;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Read-only projection of {@link AuditLog} returned to the admin UI.
 */
public record AuditLogDto(
        UUID id,
        UUID actorId,
        String actorRole,
        String action,
        String targetType,
        String targetId,
        String detail,
        String oldData,
        String newData,
        LocalDateTime createdAt
) {
    public static AuditLogDto from(AuditLog log) {
        return new AuditLogDto(
                log.getId(), log.getActorId(), log.getActorRole(), log.getAction(),
                log.getTargetType(), log.getTargetId(), log.getDetail(),
                log.getOldData(), log.getNewData(), log.getCreatedAt());
    }
}