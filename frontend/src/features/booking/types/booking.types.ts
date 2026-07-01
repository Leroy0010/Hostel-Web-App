import type { PaginationParams } from '@/types/pagination';
import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

/**
 * Full booking lifecycle status.
 * Mirrors {@code com.leroy.hostelbackend.module.booking.model.BookingStatus}.
 *
 * State machine (simplified):
 *  PENDING → APPROVED → CHECKED_IN → CHECKED_OUT
 *  PENDING → REJECTED
 *  PENDING | APPROVED → CANCELLED (student action)
 *  APPROVED → EXPIRED (payment deadline missed)
 */
export type BookingStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'CHECKED_IN'
    | 'CHECKED_OUT'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'WAITLISTED';

/**
 * Semester options accepted by the backend.
 * Mirrors the {@code @Pattern} constraint on {@code CreateBookingRequest.semester}.
 */
export type Semester = 'FIRST' | 'SECOND' | 'FULL';

// =============================================================================
// Response shapes
// (Axios interceptor strips ApiResponse<T> envelope — these are raw payloads)
// =============================================================================

/**
 * Minimal student info embedded in booking responses.
 * Mirrors {@code BookingDto.StudentSummary}.
 */
export interface BookingStudentSummary {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

/**
 * Minimal room info embedded in booking responses.
 * Mirrors {@code BookingDto.RoomSummary}.
 */
export interface BookingRoomSummary {
    id: string;
    roomNumber: string;
    roomType: string;
    hostelId: string;
    hostelName: string;
}

/**
 * Minimal approver info embedded in booking responses.
 * Mirrors {@code BookingDto.ApprovedBySummary}.
 */
export interface BookingApprovedBySummary {
    id: string;
    firstName: string;
    lastName: string;
}

/**
 * Full booking detail.
 * Mirrors {@code BookingDto}.
 *
 * All date-time fields are ISO 8601 strings (backend sends {@code LocalDateTime}
 * which Jackson serialises as a string).
 */
export interface BookingDto {
    id: string;
    student: BookingStudentSummary;
    room: BookingRoomSummary;
    status: BookingStatus;
    academicYear: string;
    semester: Semester;
    isWaitlistDraft: boolean;
    requestedAt: string;
    approvedAt: string | null;
    approvedBy: BookingApprovedBySummary | null;
    /** ISO string deadline for payment submission after approval. Null when not yet approved. */
    paymentExpiresAt: string | null;
    /** ISO string deadline for a waitlist-promoted PENDING booking. Non-null only for waitlist drafts. */
    pendingExpiresAt: string | null;
    rejectedAt: string | null;
    rejectedReason: string | null;
    checkedInAt: string | null;
    checkedOutAt: string | null;
    /** BigDecimal serialised as string by Jackson. */
    amountPaid: string | null;
    paymentRef: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Lightweight booking summary for paginated lists.
 * Mirrors {@code BookingSummaryDto}.
 */
export interface BookingSummaryDto {
    id: string;
    studentId: string;
    studentName: string;
    roomId: string;
    roomNumber: string;
    hostelName: string;
    status: BookingStatus;
    academicYear: string;
    semester: Semester;
    isWaitlistDraft: boolean;
    requestedAt: string;
    /** Null until the booking is approved. */
    paymentExpiresAt: string | null;
}



// =============================================================================
// Zod validation schemas
// =============================================================================

/**
 * Student booking creation schema.
 * Maps to {@code POST /api/bookings} → {@code CreateBookingRequest}.
 */
export const createBookingSchema = z.object({
    roomId: z.uuid('Invalid room ID'),
    academicYear: z
        .string()
        .regex(
            /^\d{4}\/\d{4}$/,
            'Academic year must be in the format YYYY/YYYY, e.g. 2024/2025'
        ),
    semester: z.enum(['FIRST', 'SECOND', 'FULL'], {
        error: 'Semester must be FIRST, SECOND, or FULL',
    }),
    // Virtual field just to track the dropdown selection UI
  selectedPeriodKey: z.string().min(1, "Please select a period"),
});

export type CreateBookingFormValues = z.infer<typeof createBookingSchema>;

/**
 * Student payment submission schema.
 * Maps to {@code POST /api/bookings/{id}/payment} → {@code SubmitPaymentRequest}.
 */
export const submitPaymentSchema = z.object({
    paymentRef: z
        .string()
        .min(1, 'Payment reference is required')
        .max(100, 'Payment reference must not exceed 100 characters')
        .trim(),
    amountPaid: z
        .string()
        .min(1, 'Amount paid is required')
        .refine(
            (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
            'Amount paid must be greater than 0'
        ),
});

export type SubmitPaymentFormValues = z.infer<typeof submitPaymentSchema>;

/**
 * Manager approve/reject schema.
 * Maps to {@code POST /api/manager/bookings/{id}/action} → {@code ActionBookingRequest}.
 */
export const actionBookingSchema = z
    .object({
        approved: z.boolean(),
        rejectedReason: z
            .string()
            .max(500, 'Reason must not exceed 500 characters')
            .optional(),
        gracePeriodHours: z
            .number()
            .int()
            .min(1, 'Grace period must be at least 1 hour')
            .max(720, 'Grace period must not exceed 720 hours')
            .optional(),
    })
    .refine(
        (data) => {
            // rejectedReason is required when approved = false
            if (data.approved === false) {
                return Boolean(
                    data.rejectedReason && data.rejectedReason.trim().length > 0
                );
            }
            return true;
        },
        {
            message: 'A rejection reason is required',
            path: ['rejectedReason'],
        }
    );

export type ActionBookingFormValues = z.infer<typeof actionBookingSchema>;

// =============================================================================
// API payload types
// =============================================================================

/** Sent to {@code POST /api/bookings}. */
export interface CreateBookingPayload {
    roomId: string;
    academicYear: string;
    semester: Semester;
}

/** Sent to {@code POST /api/bookings/{id}/payment}. */
export interface SubmitPaymentPayload {
    paymentRef: string;
    amountPaid: string;
}

/** Sent to {@code POST /api/manager/bookings/{id}/action}. */
export interface ActionBookingPayload {
    approved: boolean;
    rejectedReason?: string;
    gracePeriodHours?: number;
}

// =============================================================================
// Query parameter types
// =============================================================================

/** Pagination params for booking list endpoints. */
export interface BookingPageParams extends PaginationParams {
    status?: BookingStatus;
}
