import { z } from 'zod';
import type { PaginationParams } from '@/types/pagination';
import type { RoomType } from '@/features/room/types/room.types';
import type { Semester } from '@/features/booking/types/booking.types';


/**
 * Student-facing waitlist entry — shows what the student is queued for.
 * Mirrors {@code WaitlistDto} on the backend.
 *
 * Returned by:
 *  - {@code POST /api/waitlists} (join)
 *  - {@code GET /api/waitlists/my} (list)
 */
export interface WaitlistDto {
    id: string;
    hostelId: string;
    hostelName: string;
    hostelImageUrl: string;
    roomType: RoomType;
    /** 1-based queue position. */
    position: number;
    academicYear: string;
    semester: Semester;
    joinedAt: string;
    /** True once the backend has promoted this entry and notified the student. */
    notified: boolean;
}

/**
 * Manager-facing waitlist entry — shows who is in the queue.
 * Mirrors {@code WaitlistEntryDto} on the backend.
 *
 * Returned by {@code GET /api/manager/hostels/{hostelId}/waitlist}.
 */
export interface WaitlistEntryDto {
    id: string;
    position: number;
    studentId: string;
    studentFirstName: string;
    studentLastName: string;
    studentEmail: string;
    roomType: RoomType;
    academicYear: string;
    semester: Semester;
    joinedAt: string;
    notified: boolean;
}

/**
 * Waitlist status response for a student checking their own position.
 * Mirrors {@code WaitlistStatusDto} on the backend.
 *
 * Returned by {@code GET /api/waitlists/status/{hostelId}}.
 */
export interface WaitlistStatusDto {
    onWaitlist: boolean;
    /** 1-based rank — null when the student is not on the list. */
    position: number | null;
    totalInQueue: number;
    roomType: string;
    academicYear: string;
    semester: string;
}

// =============================================================================
// API payload types
// =============================================================================

/**
 * Request body for joining or leaving a hostel waitlist.
 * Mirrors {@code JoinWaitlistRequest} on the backend.
 *
 * Maps to:
 *  - {@code POST /api/waitlists}
 *  - {@code DELETE /api/waitlists/{hostelId}}
 */
export interface JoinWaitlistPayload {
    hostelId: string;
    roomType: RoomType;
    /** Format: "YYYY/YYYY" — e.g. "2025/2026" */
    academicYear: string;
    semester: Semester;
}

export interface LeaveWaitlistPayloadType {
        hostelId: string;
        payload: Omit<JoinWaitlistPayload, 'hostelId'>;
    }

// =============================================================================
// Query param types
// =============================================================================

/**
 * Pagination params for the student "my waitlist" list endpoint.
 * Maps to {@code GET /api/waitlists/my}.
 */
export type WaitlistPageParams = PaginationParams;

/**
 * Query params for checking waitlist status.
 * Maps to {@code GET /api/waitlists/status/{hostelId}}.
 */
export interface WaitlistStatusParams {
    roomType: RoomType;
    academicYear: string;
    semester: Semester;
}

/**
 * Query params for the manager hostel waitlist view.
 * Maps to {@code GET /api/manager/hostels/{hostelId}/waitlist}.
 */
export interface ManagerWaitlistParams extends PaginationParams {
    roomType?: RoomType;
    academicYear?: string;
    semester?: Semester;
}

// =============================================================================
// Zod schemas — form validation
// =============================================================================

/**
 * Schema for the student join-waitlist form.
 * Maps to {@code POST /api/waitlists} → {@code JoinWaitlistRequest}.
 *
 * Mirrors the backend {@code @Pattern} and {@code @NotNull} constraints.
 */
export const joinWaitlistSchema = z.object({
    hostelId: z.uuid('Invalid hostel ID'),

    roomType: z.enum(
        ['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD',],
        { error: 'Please select a room type' }
    ),

    academicYear: z
        .string()
        .min(1, 'Academic year is required')
        .regex(
            /^\d{4}\/\d{4}$/,
            'Academic year must be in the format YYYY/YYYY, e.g. 2025/2026'
        ),

    semester: z.enum(['FIRST', 'SECOND', 'FULL'], {
        error: 'Please select a semester',
    }),
     selectedPeriodKey: z.string().min(1, "Please select a period"),
});

export type JoinWaitlistFormValues = z.infer<typeof joinWaitlistSchema>;