import type { PaginationParams } from '@/types/pagination';
import { z } from 'zod';

// =============================================================================
// Enums — mirror Java enums exactly
// =============================================================================

/**
 * Mirrors {@code com.leroy.hostelbackend.module.room.model.RoomType}.
 * Add values here if the Java enum grows.
 */
export type RoomType = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD';

/**
 * Mirrors {@code com.leroy.hostelbackend.module.room.model.RoomStatus}.
 */
export type RoomStatus =
    'AVAILABLE' | 'FULLY_OCCUPIED' | 'UNDER_MAINTENANCE' | 'RESERVED';

// =============================================================================
// Response shapes
// (Axios interceptor strips ApiResponse<T> envelope — these are the raw payloads)
// =============================================================================

/**
 * Single amenity embedded in a {@link RoomDto}.
 * Mirrors {@code AmenityDto}.
 */
export interface AmenityDto {
    id: string;
    amenity: string;
    /** Optional icon URL for this amenity — may be null. */
    imageUrl: string | null;
}

/**
 * Full room detail including amenity list.
 * Mirrors {@code RoomDto}.
 */
export interface RoomDto {
    id: string;
    hostelId: string;
    hostelName: string;
    roomNumber: string;
    roomType: RoomType;
    capacity: number;
    currentOccupancy: number;
    /** Computed server-side: capacity - currentOccupancy */
    bedsAvailable: number;
    pricePerSemester: number;
    status: RoomStatus;
    floorNumber: number | null;
    imageUrl: string;
    amenities: AmenityDto[];
    createdAt: string;
    updatedAt: string;
}

/**
 * Lightweight room summary for lists and the horizontal preview strip.
 * Mirrors {@code RoomSummaryDto}.
 */
export interface RoomSummaryDto {
    id: string;
    roomNumber: string;
    roomType: RoomType;
    capacity: number;
    currentOccupancy: number;
    bedsAvailable: number;
    pricePerSemester: number;
    status: RoomStatus;
    floorNumber: number | null;
    imageUrl: string;
}

// =============================================================================
// Query parameter types
// =============================================================================

/** Parameters for the student-facing available rooms endpoint. */
export interface AvailableRoomsParams extends PaginationParams {
    roomType?: RoomType;
    maxPrice?: string;
}

/** Parameters for the manager/admin all-rooms endpoint. */
export type AllRoomsParams = PaginationParams;

// =============================================================================
// Zod validation schemas — used for form validation
// =============================================================================

/**
 * Amenity entry schema for use inside the room creation/update forms.
 * Mirrors {@code AmenityRequest}.
 */
export const amenityRequestSchema = z.object({
    amenity: z
        .string()
        .min(1, 'Amenity label is required')
        .max(100, 'Amenity label must not exceed 100 characters')
        .trim(),
    imageUrl: z.url().optional().or(z.literal('')),
});

export type AmenityRequestForm = z.infer<typeof amenityRequestSchema>;

/**
 * Zod schema for creating a room.
 * Maps to {@code POST /api/manager/hostels/{hostelId}/rooms} → {@code CreateRoomRequest}.
 *
 * Notes:
 * - {@code imageUrl} is populated after a successful image upload.
 * - {@code capacity} is stored as {@code Short} on the backend (max 20).
 * - {@code pricePerSemester} is stored as {@code BigDecimal} — we validate as
 *   a coerced number and format before sending.
 */
export const createRoomSchema = z.object({
    roomNumber: z
        .string()
        .min(1, 'Room number is required')
        .max(20, 'Room number must not exceed 20 characters')
        .trim(),
    roomType: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD'], {
        error: 'Room type is required',
    }),
    capacity: z
        .number({
            error: 'Capacity must be a number',
        })
        .int('Capacity must be a whole number')
        .min(1, 'Capacity must be at least 1')
        .max(20, 'Capacity cannot exceed 20'),
    pricePerSemester: z
        .union([z.string(), z.number()]) // Input allows string or number
        .transform((val) => {
            const num = Number(val);
            return isNaN(num) ? 0 : num;
        })
        .refine((val) => val > 0, { message: 'Price must be greater than 0' })
        .refine((val) => /^-?\d+(\.\d{1,2})?$/.test(val.toString()), {
            error: 'Price can have at most two decimal places.',
        }),
    imageUrl: z.string().min(1, 'Please upload a room image'),
    floorNumber: z
        .number({ error: 'Floor number must be a number' })
        .int()
        .min(0, 'Floor must be 0 or above')
        .optional()
        .nullable(),
    amenities: z.array(amenityRequestSchema).optional(),
});

export type CreateRoomFormValues = z.infer<typeof createRoomSchema>;
export type CreateRoomFormInput = z.input<typeof createRoomSchema>;

/**
 * Zod schema for updating a room (patch semantics — all fields optional).
 * Maps to {@code PUT /api/manager/rooms/{id}} → {@code UpdateRoomRequest}.
 */
export const updateRoomSchema = z.object({
    roomNumber: z
        .string()
        .max(20, 'Room number must not exceed 20 characters')
        .trim()
        .optional(),
    roomType: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD']).optional(),
    capacity: z.number().int().min(1).max(20).optional(),
    pricePerSemester: z
        .union([z.string(), z.number()]) // Input allows string or number
        .transform((val) => {
            const num = Number(val);
            return isNaN(num) ? 0 : num;
        })
        .refine((val) => val > 0, { message: 'Price must be greater than 0' })
        .refine((val) => /^-?\d+(\.\d{1,2})?$/.test(val.toString()), {
            error: 'Price can have at most two decimal places.',
        })
        .optional(),
    imageUrl: z.string().optional(),
    floorNumber: z.number().int().min(0).optional().nullable(),
});

export type UpdateRoomFormValues = z.infer<typeof updateRoomSchema>;
export type UpdateRoomFormInput = z.input<typeof updateRoomSchema>;

/**
 * Zod schema for updating room status.
 * Maps to {@code PATCH /api/manager/rooms/{id}/status} → {@code UpdateRoomStatusRequest}.
 */
export const updateRoomStatusSchema = z.object({
    status: z.enum(
        ['AVAILABLE', 'FULLY_OCCUPIED', 'UNDER_MAINTENANCE', 'RESERVED'],
        {
            error: 'Status is required',
        }
    ),
});

export type UpdateRoomStatusFormValues = z.infer<typeof updateRoomStatusSchema>;

// =============================================================================
// API payload types
// =============================================================================

/** Sent to {@code POST /api/manager/hostels/{hostelId}/rooms}. */
export interface CreateRoomPayload {
    roomNumber: string;
    roomType: RoomType;
    capacity: number;
    pricePerSemester: number;
    imageUrl: string;
    floorNumber?: number | null;
    amenities?: { amenity: string; imageUrl?: string }[];
}

/** Sent to {@code PUT /api/manager/rooms/{id}}. */
export interface UpdateRoomPayload {
    roomNumber?: string;
    roomType?: RoomType;
    capacity?: number;
    pricePerSemester?: number;
    imageUrl?: string;
    floorNumber?: number | null;
}

/** Sent to {@code PUT /api/manager/rooms/{id}/amenities} and {@code POST /api/manager/rooms/{id}/amenities}. */
export interface AmenityPayload {
    amenity: string;
    imageUrl?: string | null;
}
