import { apiClient } from '@/lib/axios';
import type {
    AddAttachmentPayload,
    AttachmentDto,
    ComplaintDto,
    ComplaintPageParams,
    ComplaintSummaryDto,
    CreateComplaintPayload,
    ReactPayload,
    UpdateComplaintStatusPayload,
} from '../types/complaint.types';
import type { PageResponse } from '@/types/pagination';

/** Maps to: {@code POST /api/complaints} */
export function createComplaint(
    payload: CreateComplaintPayload
): Promise<ComplaintDto> {
    return apiClient.post('/complaints', payload);
}

/** Maps to: {@code GET /api/complaints/my} */
export function fetchMyComplaints(
    params: ComplaintPageParams = {}
): Promise<PageResponse<ComplaintSummaryDto>> {
    return apiClient.get('/complaints/my', {
        params: {
            page: params.page ?? 0,
            size: params.size ?? 10,
            sort: 'createdAt,desc',
        },
    });
}

/** Maps to: {@code GET /api/complaints/{id}} */
export function fetchComplaintById(id: string): Promise<ComplaintDto> {
    return apiClient.get(`/complaints/${id}`);
}

/** Maps to: {@code DELETE /api/complaints/{id}} */
export function deleteComplaint(id: string): Promise<void> {
    return apiClient.delete(`/complaints/${id}`);
}

/** Maps to: {@code PATCH /api/manager/complaints/{id}/status} */
export function updateComplaintStatus(
    id: string,
    payload: UpdateComplaintStatusPayload
): Promise<ComplaintDto> {
    return apiClient.patch(`/manager/complaints/${id}/status`, payload);
}

/** Maps to: {@code GET /api/manager/hostels/{hostelId}/complaints} */
export function fetchHostelComplaints(
    hostelId: string,
    params: ComplaintPageParams = {}
): Promise<PageResponse<ComplaintSummaryDto>> {
    return apiClient.get(`/manager/hostels/${hostelId}/complaints`, {
        params: {
            page: params.page ?? 0,
            size: params.size ?? 20,
            sort: 'createdAt,desc',
            ...(params.status && { status: params.status }),
        },
    });
}

/** Maps to: {@code POST /api/complaints/{id}/react} */
export function reactToComplaint(
    id: string,
    payload: ReactPayload
): Promise<ComplaintDto> {
    return apiClient.post(`/complaints/${id}/react`, payload);
}

/** Maps to: {@code POST /api/complaints/{id}/attachments} */
export function addAttachment(
    id: string,
    payload: AddAttachmentPayload
): Promise<AttachmentDto> {
    return apiClient.post(`/complaints/${id}/attachments`, payload);
}

/** Maps to: {@code DELETE /api/complaints/attachments/{attachmentId}} */
export function deleteAttachment(attachmentId: string): Promise<void> {
    return apiClient.delete(`/complaints/attachments/${attachmentId}`);
}
