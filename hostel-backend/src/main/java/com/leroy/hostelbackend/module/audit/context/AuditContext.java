package com.leroy.hostelbackend.module.audit.context;

/**
 * Lets an {@link com.leroy.hostelbackend.module.audit.annotation.Audited}
 * method pass a "before" snapshot to {@link com.leroy.hostelbackend.module.audit.aspect.AuditAspect}
 * without changing every method's signature to thread an extra parameter
 * through.
 *
 * <p><strong>Usage</strong> — inside an {@code @Audited} service method,
 * before mutating the entity:
 * <pre>{@code
 * @Audited(action = "USER_DEACTIVATED", targetType = "User")
 * public UserDto deactivateUser(UUID userId) {
 *     var user = requireUser(userId);
 *     AuditContext.captureOld(userMapper.toDto(user)); // snapshot BEFORE mutation
 *     user.setIsActive(false);
 *     return userMapper.toDto(userRepository.save(user));
 * }
 * }</pre>
 *
 * <p>The aspect reads and clears the value after the method returns, so
 * nothing leaks across requests. If a method never calls
 * {@link #captureOld}, {@code oldData} on the audit row is simply {@code null}.
 */
public final class AuditContext {

    private static final ThreadLocal<Object> OLD_SNAPSHOT = new ThreadLocal<>();

    private AuditContext() {}

    public static void captureOld(Object snapshot) {
        OLD_SNAPSHOT.set(snapshot);
    }

    /** Reads and clears the current thread's captured snapshot (if any). */
    public static Object takeOld() {
        Object value = OLD_SNAPSHOT.get();
        OLD_SNAPSHOT.remove();
        return value;
    }
}