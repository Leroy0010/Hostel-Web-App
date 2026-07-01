import { z } from 'zod';

// =============================================================================
// Enums — mirror Java enum exactly
// =============================================================================

/**
 * Category of a campus landmark.
 * Mirrors {@code com.leroy.hostelbackend.module.map.model.LandmarkCategory}.
 * Used by the map frontend to render the correct icon per point of interest.
 */
export type LandmarkCategory =
    | 'ACADEMIC'
    | 'LIBRARY'
    | 'ADMINISTRATIVE'
    | 'CAFETERIA'
    | 'MEDICAL'
    | 'SPORTS'
    | 'HOSTEL'
    | 'OTHER';

// =============================================================================
// Response shapes
// (Axios interceptor strips ApiResponse<T> — these are raw payloads)
// =============================================================================

/**
 * Full landmark detail. Mirrors {@code LandmarkDto}.
 */
export interface LandmarkDto {
    id: string;
    name: string;
    /** String serialisation of {@link LandmarkCategory} enum. */
    category: LandmarkCategory;
    latitude: number;
    longitude: number;
    description: string | null;
    hostelId: string | null
}

/**
 * Distance calculation result between a hostel and a landmark.
 * Mirrors {@code DistanceDto}.
 */
export interface DistanceDto {
    hostelId: string;
    hostelName: string;
    landmarkId: string;
    landmarkName: string;
    /** Straight-line distance in metres. */
    distanceMetres: number;
    /** Same distance in kilometres, rounded to 2 dp. */
    distanceKm: number;
    /** Estimated walking time at 5 km/h, rounded up. */
    walkingMinutes: number;
}

/**
 * A nearby landmark with its computed distance from a reference hostel.
 * Mirrors {@code NearbyLandmarkDto}.
 */
export interface NearbyLandmarkDto {
    landmark: LandmarkDto;
    distanceMetres: number;
    distanceKm: number;
    walkingMinutes: number;
}

// =============================================================================
// Zod schemas — Zod v4 syntax (no required_error/invalid_type_error, use error:)
// =============================================================================

const CategoryEnum = z.enum(
    [
        'ACADEMIC',
        'LIBRARY',
        'ADMINISTRATIVE',
        'CAFETERIA',
        'MEDICAL',
        'SPORTS',
        'HOSTEL',
        'OTHER',
    ],
    { error: 'Category is required' }
);

/**
 * Admin landmark creation schema.
 * Maps to {@code POST /api/admin/landmarks} → {@code CreateLandmarkRequest}.
 */
export const createLandmarkSchema = z.object({
    name: z
        .string()
        .min(1, 'Landmark name is required')
        .max(200, 'Name must not exceed 200 characters')
        .trim(),
    category: CategoryEnum,
    hostelId: z.uuid().optional(),
    latitude: z
        .number({ error: 'Latitude is required' })
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90'),
    longitude: z
        .number({ error: 'Longitude is required' })
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180'),
    description: z
        .string()
        .max(500, 'Description must not exceed 500 characters')
        .optional(),
});

export type CreateLandmarkFormValues = z.infer<typeof createLandmarkSchema>;

/**
 * Admin landmark update schema — patch semantics, all fields optional.
 * Maps to {@code PUT /api/admin/landmarks/{id}} → {@code UpdateLandmarkRequest}.
 */
export const updateLandmarkSchema = z.object({
    name: z
        .string()
        .max(200, 'Name must not exceed 200 characters')
        .trim()
        .optional(),
    category: CategoryEnum.optional(),
    hostelId: z.uuid().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    description: z.string().max(500).optional(),

});

export type UpdateLandmarkFormValues = z.infer<typeof updateLandmarkSchema>;

// =============================================================================
// API payload types
// =============================================================================

/** Sent to {@code POST /api/admin/landmarks}. */
export interface CreateLandmarkPayload {
    name: string;
    category: LandmarkCategory;
    latitude: number;
    longitude: number;
    description?: string;
    hostelId?: string
}

/** Sent to {@code PUT /api/admin/landmarks/{id}}. */
export interface UpdateLandmarkPayload {
    name?: string;
    category?: LandmarkCategory;
    latitude?: number;
    longitude?: number;
    description?: string;
    hostelId?: string
}
