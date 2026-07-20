import { apiClient } from '@/lib/axios';
import type { PageResponse } from '@/types/pagination';
import type { AuditLogDto, AuditLogListParams } from '../types/audit.types';

/**
 * Fetches a paginated list of privileged-action audit log entries,
 * most recent first.
 *
 * Maps to: {@code GET /api/admin/audit-logs}
 *
 * @param params - Pagination params (page, size, sort).
 */
export function fetchAuditLogs(
    params: AuditLogListParams
): Promise<PageResponse<AuditLogDto>> {
    return apiClient.get('/admin/audit-logs', { params });
}
