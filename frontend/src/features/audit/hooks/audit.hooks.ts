import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '../api/audit.api';
import { auditKeys } from '../types/audit.keys';
import type { AuditLogListParams } from '../types/audit.types';

/**
 * Paginated list of privileged-action audit log entries — admin only.
 *
 * Maps to: {@code GET /api/admin/audit-logs}
 *
 * @param params - Pagination params.
 */
export function useAuditLogs(params: AuditLogListParams = {}) {
    return useQuery({
        queryKey: auditKeys.list(params),
        queryFn: () => fetchAuditLogs(params),
    });
}
