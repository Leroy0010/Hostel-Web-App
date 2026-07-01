// =============================================================================
// dashboard.api.ts
// =============================================================================
import { apiClient } from '@/lib/axios';
import type { DashboardData } from '../types/dashboard.types';

/**
 * Fetches the role-specific dashboard payload.
 *
 * Maps to: {@code GET /api/dashboard}
 *
 * The backend returns a discriminated union keyed on {@code "role"}.
 * The Axios interceptor strips the {@code ApiResponse<T>} envelope so this
 * function receives the {@link DashboardData} directly.
 */
export function fetchDashboard(): Promise<DashboardData> {
    return apiClient.get('/dashboard');
}