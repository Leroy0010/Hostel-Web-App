import type { PaginationParams } from '@/types/pagination';
import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

/**
 * Gender occupancy policy of a hostel.
 * Mirrors the Java {@code GenderPolicy} enum exactly — including the _ONLY suffix.
 */
export type GenderPolicy = 'MALE_ONLY' | 'FEMALE_ONLY' | 'MIXED';

// =============================================================================
// Response shapes
// (The Axios interceptor strips the ApiResponse envelope, so these types
//  represent what arrives at React Query hooks after unwrapping.)
// =============================================================================

/**
 * Minimal manager information embedded in hostel responses.
 * Mirrors {@code HostelDto.ManagerSummary} on the backend.
 */
export interface HostelManager {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
}

/**
 * Full hostel detail.
 * Mirrors {@code HostelDto} on the backend.
 */
export interface HostelDto {
    id: string;
    name: string;
    address: string;
    description: string | null;
    genderPolicy: GenderPolicy;
    imageUrl: string;
    isActive: boolean;
    latitude: number | null;
    longitude: number | null;
    manager: HostelManager | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Lightweight hostel summary used in paginated lists.
 * Mirrors {@code HostelSummaryDto} on the backend.
 */
export interface HostelSummaryDto {
    id: string;
    name: string;
    address: string;
    genderPolicy: GenderPolicy;
    imageUrl: string;
    isActive: boolean;
}


// =============================================================================
// Zod schemas — used for form validation
// =============================================================================

/**
 * WGS 84 coordinate validator, reused for both latitude and longitude fields.
 * Accepts a string (from an HTML input) and coerces to a number.
 */
const latitudeSchema = z.preprocess(
    (val) =>
        val === '' || val === null || val === undefined
            ? undefined
            : Number(val),
    z
        .number({ error: 'Latitude must be a number' })
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90')
        .optional()
);

const longitudeSchema = z.preprocess(
    (val) =>
        val === '' || val === null || val === undefined
            ? undefined
            : Number(val),
    z
        .number({ error: 'Longitude must be a number' })
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180')
        .optional()
);

/**
 * Zod schema for hostel creation.
 * Maps to {@code POST /api/admin/hostels} → {@code CreateHostelRequest}.
 *
 * Notes:
 * - {@code imageUrl} is populated programmatically after the image upload
 *   completes — it is not a user-typed field.
 * - Coordinates are optional at creation time.
 * - {@code managerId} is optional — can be assigned after creation.
 */
export const createHostelSchema = z.object({
    name: z
        .string()
        .min(1, 'Hostel name is required')
        .max(150, 'Name must not exceed 150 characters')
        .trim(),
    address: z
        .string()
        .min(1, 'Address is required')
        .max(300, 'Address must not exceed 300 characters')
        .trim(),
    description: z
        .string()
        .max(2000, 'Description must not exceed 2000 characters')
        .optional(),
    genderPolicy: z.enum(['MALE_ONLY', 'FEMALE_ONLY', 'MIXED'], {
        error: 'Invalid gender policy',
    }),
    /** Populated after a successful image upload — required before submitting. */
    imageUrl: z.string().min(1, 'Please upload a cover image'),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    managerId: z
        .string()
        .uuid('Invalid manager ID')
        .optional()
        .or(z.literal('')),
});

/**
 * Zod schema for hostel updates.
 * Maps to {@code PUT /api/admin/hostels/{id}} — all fields optional (patch semantics).
 */
export const updateHostelSchema = z.object({
    name: z
        .string()
        .max(150, 'Name must not exceed 150 characters')
        .trim()
        .optional(),
    address: z
        .string()
        .max(300, 'Address must not exceed 300 characters')
        .trim()
        .optional(),
    description: z.string().max(2000).optional(),
    genderPolicy: z.enum(['MALE_ONLY', 'FEMALE_ONLY', 'MIXED']).optional(),
    imageUrl: z.string().optional(),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
});

/**
 * Zod schema for assigning a manager to a hostel.
 * Maps to {@code POST /api/admin/hostels/{id}/manager}.
 */
export const assignManagerSchema = z.object({
    managerId: z.string().uuid('Please select a valid manager'),
});

// =============================================================================
// Inferred form types
// =============================================================================

/** Form values for the create hostel form. */
export type CreateHostelFormValues = z.infer<typeof createHostelSchema>;

/** Form values for the update hostel form. */
export type UpdateHostelFormValues = z.infer<typeof updateHostelSchema>;

/** Form values for the assign manager dialog. */
export type AssignManagerFormValues = z.infer<typeof assignManagerSchema>;

// =============================================================================
// API payload types
// (Sent to the backend — may differ slightly from form values)
// =============================================================================

/**
 * Request body for {@code POST /api/admin/hostels}.
 * Strips empty optional fields before sending.
 */
export interface CreateHostelPayload {
    name: string;
    address: string;
    description?: string;
    genderPolicy: GenderPolicy;
    imageUrl: string;
    latitude?: number;
    longitude?: number;
    managerId?: string;
}

/**
 * Request body for {@code PUT /api/admin/hostels/{id}}.
 * All fields are optional — only non-null values are applied server-side.
 */
export interface UpdateHostelPayload {
    name?: string;
    address?: string;
    description?: string;
    genderPolicy?: GenderPolicy;
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
}

/** Request body for {@code POST /api/admin/hostels/{id}/manager}. */
export interface AssignManagerPayload {
    managerId: string;
}

// =============================================================================
// Query parameter types
// =============================================================================

/** Pagination query parameters forwarded to paginated hostel endpoints. */
export type HostelPageParams  = PaginationParams;
