package com.leroy.hostelbackend.module.audit.aspect;

import com.leroy.hostelbackend.module.audit.annotation.Audited;
import com.leroy.hostelbackend.module.audit.context.AuditContext;
import com.leroy.hostelbackend.module.audit.service.AuditLogService;
import com.leroy.hostelbackend.module.user.model.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.text.MessageFormat;
import java.util.UUID;

/**
 * Intercepts every {@link Audited} service method and writes a row to the
 * audit trail once the method has returned successfully.
 *
 * <p><strong>Why {@code @Around} and not {@code @AfterReturning}:</strong>
 * we need to read the joinpoint's return value AND the caller's arguments
 * (for the {@code detail} template and target-id resolution) with full
 * control over ordering, and {@code @Around} lets the audit write happen
 * strictly after {@code proceed()} returns without interfering with the
 * method's own return value.
 *
 * <p><strong>Failure handling:</strong> if the target method throws, we
 * re-throw immediately and record nothing — a failed operation has nothing
 * to audit. If audit recording itself fails, {@link AuditLogService#record}
 * already swallows that internally so it can never surface as a 500 to the
 * caller of the business method.
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditAspect {

    private final AuditLogService auditLogService;

    @Around("@annotation(audited)")
    public Object audit(ProceedingJoinPoint joinPoint, Audited audited) throws Throwable {
        Object[] args = joinPoint.getArgs();

        Object result = joinPoint.proceed();

        try {
            recordAudit(joinPoint, audited, args, result);
        } catch (Exception ex) {
            // Belt-and-braces — AuditLogService.record already catches internally,
            // but resolving the actor/detail here must never break the caller either.
            log.error("[AUDIT] Failed to build audit entry for {}", audited.action(), ex);
        }

        return result;
    }

    private void recordAudit(ProceedingJoinPoint joinPoint, Audited audited, Object[] args, Object result) {
        CustomUserDetails actor = resolveActor();
        if (actor == null) {
            // System/internal call with no authenticated principal (e.g. a scheduled
            // job) — nothing meaningful to attribute this action to.
            log.debug("[AUDIT] Skipping {} — no authenticated actor in context", audited.action());
            return;
        }

        Object oldSnapshot = AuditContext.takeOld();
        String targetId = resolveTargetId(args, result);
        String detail = buildDetail(audited, args);

        auditLogService.record(
                actor.getUserId(),
                actor.getRole().name(),
                audited.action(),
                audited.targetType(),
                targetId,
                detail,
                oldSnapshot,
                result
        );
    }

    private CustomUserDetails resolveActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails principal)) {
            return null;
        }
        return principal;
    }

    /**
     * Best-effort target-id resolution: prefers the first {@link UUID} method
     * argument (the common "operate on this ID" shape), then falls back to
     * calling {@code getId()} on the return value via reflection.
     */
    private String resolveTargetId(Object[] args, Object result) {
        for (Object arg : args) {
            if (arg instanceof UUID uuid) {
                return uuid.toString();
            }
        }
        if (result != null) {
            try {
                Method getId = result.getClass().getMethod("getId");
                Object id = getId.invoke(result);
                return id != null ? id.toString() : null;
            } catch (ReflectiveOperationException ignored) {
                // Return type has no getId() — fine, not every audited action has one.
            }
        }
        return null;
    }

    private String buildDetail(Audited audited, Object[] args) {
        if (audited.detail().isBlank()) {
            return null;
        }
        try {
            return MessageFormat.format(audited.detail(), args);
        } catch (Exception ex) {
            // Malformed template shouldn't block the write — fall back to the raw template.
            return audited.detail();
        }
    }
}