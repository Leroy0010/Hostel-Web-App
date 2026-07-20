import type { PaginationParams } from '@/types/pagination';

// =============================================================================
// Response DTOs
// =============================================================================

/**
 * Read-only projection of a privileged-action audit entry.
 * Mirrors the backend {@code AuditLogDto}.
 */
export interface AuditLogDto {
    id: string;
    actorId: string;
    /** Role of the actor at the time of the action, e.g. "ADMIN". */
    actorRole: string;
    /** Machine-readable action code, e.g. "USER_DEACTIVATED". */
    action: string;
    /** Type of entity affected, e.g. "User", "Hostel", "Room". Nullable for global actions. */
    targetType: string | null;
    targetId: string | null;
    /** Human-readable summary, e.g. "Deactivated user <uuid>". */
    detail: string | null;
    /** JSON snapshot of the target entity before the action, or null. */
    oldData: string | null;
    /** JSON snapshot of the target entity after the action, or null. */
    newData: string | null;
    createdAt: string;
}

// =============================================================================
// Query params
// =============================================================================

/**
 * Pagination params for the admin audit log list.
 * Maps to {@code GET /api/admin/audit-logs}.
 */
export type AuditLogListParams = PaginationParams;
