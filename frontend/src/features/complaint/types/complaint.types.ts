import type { PaginationParams } from '@/types/pagination';
import { z } from 'zod';

// =============================================================================
// Enums — mirror Java enums exactly
// =============================================================================

/** Mirrors {@code ComplaintStatus}. */
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

/** Mirrors {@code ComplaintCategory}. */
export type ComplaintCategory =
    'MAINTENANCE' | 'CLEANLINESS' | 'SECURITY' | 'NOISE' | 'BILLING' | 'OTHER';

// =============================================================================
// Response shapes
// =============================================================================

/** Minimal author info embedded in complaint responses. */
export interface ComplaintAuthorSummary {
    id: string;
    firstName: string;
    lastName: string;
}

/** File attachment embedded in {@link ComplaintDto}. Mirrors {@code AttachmentDto}. */
export interface AttachmentDto {
    id: string;
    fileUrl: string;
    fileType: string | null;
    submittedById: string;
    uploadedAt: string;
}

/**
 * Full complaint detail. Mirrors {@code ComplaintDto}.
 */
export interface ComplaintDto {
    id: string;
    author: ComplaintAuthorSummary;
    hostelId: string;
    hostelName: string;
    roomId: string | null;
    roomNumber: string | null;
    title: string;
    description: string;
    status: ComplaintStatus;
    category: ComplaintCategory;
    upvotes: number;
    downvotes: number;
    netScore: number;
    /** null = not voted; true = upvoted; false = downvoted */
    currentUserVote: boolean | null;
    attachments: AttachmentDto[];
    createdAt: string;
    updatedAt: string;
    resolvedAt: string | null;
}

/**
 * Lightweight complaint summary for paginated lists.
 * Mirrors {@code ComplaintSummaryDto}.
 */
export interface ComplaintSummaryDto {
    id: string;
    authorName: string;
    hostelId: string;
    hostelName: string;
    title: string;
    status: ComplaintStatus;
    category: ComplaintCategory;
    netScore: number;
    attachmentCount: number;
    createdAt: string;
}

// =============================================================================
// Zod schemas
// =============================================================================

/**
 * Student complaint creation schema.
 * Maps to {@code POST /api/complaints} → {@code CreateComplaintRequest}.
 */
export const createComplaintSchema = z.object({
    hostelId: z.uuid('Invalid hostel ID'),
    roomId: z.uuid('Invalid room ID').optional().or(z.literal('')),
    title: z
        .string()
        .min(1, 'Title is required')
        .max(200, 'Title must not exceed 200 characters')
        .trim(),
    description: z.string().min(1, 'Description is required').trim(),
    category: z.enum(
        ['MAINTENANCE', 'CLEANLINESS', 'SECURITY', 'NOISE', 'BILLING', 'OTHER'],
        { error: 'Category is required' }
    ),
});

export type CreateComplaintFormValues = z.infer<typeof createComplaintSchema>;

/**
 * Manager/admin status update schema.
 * Maps to {@code PATCH /api/manager/complaints/{id}/status}.
 */
export const updateComplaintStatusSchema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], {
        error: 'Status is required',
    }),
});

export type UpdateComplaintStatusFormValues = z.infer<
    typeof updateComplaintStatusSchema
>;

/** Add attachment schema. */
export const addAttachmentSchema = z.object({
    fileUrl: z.url('Must be a valid URL').min(1, 'File URL is required'),
    fileType: z.string().optional(),
});

export type AddAttachmentFormValues = z.infer<typeof addAttachmentSchema>;

// =============================================================================
// API payload types
// =============================================================================

/** Sent to {@code POST /api/complaints}. */
export interface CreateComplaintPayload {
    hostelId: string;
    roomId?: string;
    title: string;
    description: string;
    category: ComplaintCategory;
}

/** Sent to {@code PATCH /api/manager/complaints/{id}/status}. */
export interface UpdateComplaintStatusPayload {
    status: ComplaintStatus;
}

/** Sent to {@code POST /api/complaints/{id}/react}. */
export interface ReactPayload {
    isUpvote: boolean;
}

/** Sent to {@code POST /api/complaints/{id}/attachments}. */
export interface AddAttachmentPayload {
    fileUrl: string;
    fileType?: string;
}

/** Query params for complaint list endpoints. */
export interface ComplaintPageParams extends PaginationParams {
    status?: ComplaintStatus;
}
