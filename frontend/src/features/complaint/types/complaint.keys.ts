import type { ComplaintPageParams } from '../types/complaint.types';

/**
 * Centralized React Query key factory for the complaint feature.
 */
export const complaintKeys = {
    all: ['complaints'] as const,
    lists: () => [...complaintKeys.all, 'list'] as const,

    /** Student's own complaints. */
    myComplaints: (params: ComplaintPageParams = {}) =>
        [...complaintKeys.lists(), 'my', params] as const,

    /** Manager/admin: all complaints for a hostel. */
    hostelComplaints: (hostelId: string, params: ComplaintPageParams = {}) =>
        [...complaintKeys.lists(), 'hostel', hostelId, params] as const,

    details: () => [...complaintKeys.all, 'detail'] as const,
    detail: (id: string) => [...complaintKeys.details(), id] as const,
} as const;
