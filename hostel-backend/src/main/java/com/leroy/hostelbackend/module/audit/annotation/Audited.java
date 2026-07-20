package com.leroy.hostelbackend.module.audit.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a service method whose successful execution should be recorded in
 * the audit trail ({@code audit_logs}).
 *
 * <p>Applied by {@link com.leroy.hostelbackend.module.audit.aspect.AuditAspect},
 * which:
 * <ul>
 *   <li>resolves the acting user from {@code SecurityContextHolder};</li>
 *   <li>picks up an "old state" snapshot if the method called
 *       {@link com.leroy.hostelbackend.module.audit.context.AuditContext#captureOld}
 *       before mutating anything;</li>
 *   <li>serialises the method's return value as the "new state";</li>
 *   <li>writes the row only after the method returns successfully — a thrown
 *       exception means nothing is recorded.</li>
 * </ul>
 *
 * <p>Only meaningful on methods proxied by Spring (i.e. public methods on
 * {@code @Service} beans called from outside the bean itself).
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Audited {

    /** Machine-readable action code, e.g. {@code "USER_DEACTIVATED"}. */
    String action();

    /** Type of entity affected, e.g. {@code "User"}. */
    String targetType();

    /**
     * Human-readable detail template. {@code {0}}, {@code {1}}, ... refer to
     * the method's arguments by position (via {@link String#valueOf}).
     * Optional — falls back to just the action + target type if omitted.
     */
    String detail() default "";
}