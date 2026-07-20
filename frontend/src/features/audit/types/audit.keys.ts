import type { AuditLogListParams } from './audit.types';

/**
 * Centralized React Query key factory for the admin audit log feature.
 */
export const auditKeys = {
    /** Root — matches any audit query. */
    all: ['audit'] as const,

    /** Matches all list-type queries (any pagination variant). */
    lists: () => [...auditKeys.all, 'list'] as const,

    /**
     * Paginated audit log list.
     * Maps to {@code GET /api/admin/audit-logs}.
     */
    list: (params: AuditLogListParams) =>
        [...auditKeys.lists(), params] as const,
} as const;
