import type { RoomType } from '@/features/room/types/room.types';
import type { PageResponse, PaginationParams } from '@/types/pagination';
import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

/**
 * Gender occupancy policy of a hostel.
 * Mirrors the Java {@code GenderPolicy} enum exactly.
 */
export type GenderPolicy = 'MALE_ONLY' | 'FEMALE_ONLY' | 'MIXED';

// =============================================================================
// Embedded / shared DTOs
// (These mirror Java records used inside hostel responses.)
// =============================================================================

/**
 * A single period during which a room is available for booking.
 * Mirrors {@code AvailablePeriodDto} on the backend.
 *
 * @example { academicYear: "2024/2025", semester: "FIRST" }
 */
export interface AvailablePeriodDto {
    academicYear: string;
    semester: string;
}

/**
 * Room data embedded inside hostel detail and section responses.
 * Mirrors {@code RoomDisplayDto} on the backend.
 *
 * Replaces the old {@code RoomSummaryDto} usage in hostel-facing components.
 * Carries {@code availablePeriods} so the UI can show booking availability
 * inline without an additional API call.
 */
export interface RoomDisplayDto {
    id: string;
    roomNumber: string;
    roomType: RoomType;
    capacity: number;
    pricePerSemester: number;
    floorNumber: number;
    imageUrl: string;
    /** Periods during which this room currently accepts bookings. */
    availablePeriods: AvailablePeriodDto[];
}

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
 * Full hostel detail (coordinates, description, manager).
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
    /** WGS 84 latitude — null when coordinates have not been set. */
    latitude: number | null;
    /** WGS 84 longitude — null when coordinates have not been set. */
    longitude: number | null;
    manager: HostelManager | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Lightweight hostel summary used in paginated lists.
 * Mirrors {@code HostelSummaryDto} on the backend.
 *
 * Note: does NOT carry coordinates or rooms — use {@link HostelDetailsResponseDto}
 * for full data on the detail page.
 */
export interface HostelSummaryDto {
    id: string;
    name: string;
    address: string;
    genderPolicy: GenderPolicy;
    imageUrl: string;
    isActive: boolean;
    longitude: number;
    latitude: number
}

/**
 * Combined hostel detail + paginated rooms response.
 * Mirrors {@code HostelDetailsResponseDto} on the backend.
 *
 * Returned by {@code GET /api/hostels/{id}} so the detail page can render
 * both the hostel info panel and the room list from a **single** API call.
 *
 * @example
 * const { hostel, rooms } = useHostelDetail(hostelId);
 */
export interface HostelDetailsResponseDto {
    /** Full hostel detail including coordinates, description, manager. */
    hostel: HostelDto;
    /**
     * Paginated room list for this hostel.
     * Spring {@code Page<RoomDisplayDto>} unwrapped by the Axios interceptor
     * as a plain object (not the Java Page class).
     */
    rooms: PageResponse<RoomDisplayDto>
}

/**
 * Hostel with embedded room previews — used by the horizontal section layout
 * on the student discovery page.
 * Mirrors {@code HostelSectionDto} on the backend.
 *
 * Returned by {@code GET /api/hostels/with-room-sections} — replaces the old
 * dual-call pattern (active hostels list + N separate room-preview calls).
 */
export interface HostelSectionDto {
    id: string;
    name: string;
    address: string;
    genderPolicy: GenderPolicy;
    imageUrl: string;
    isActive: boolean;
    /** Up to 6 room previews included server-side — no separate fetch needed. */
    rooms: RoomDisplayDto[];
}

// =============================================================================
// Zod schemas — used for form validation
// =============================================================================

/**
 * WGS 84 latitude validator — accepts a number and validates the range.
 * Optional: when the field is empty the value is undefined.
 */
const latitudeSchema = z
    .union([z.number()])
    .transform((val) => {
        if (val === undefined || val === null) return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    })
    .pipe(
        z
            .number({ message: 'Latitude must be a number' })
            .min(-90, 'Latitude must be between -90 and 90')
            .max(90, 'Latitude must be between -90 and 90')
    )
    .optional();

/** WGS 84 longitude validator. */
const longitudeSchema = z
    .union([z.number()])
    .transform((val) => {
        if (val === undefined || val === null) return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    })
    .pipe(
        z
            .number({ message: 'Longitude must be a number' })
            .min(-180, 'Longitude must be between -180 and 180')
            .max(180, 'Longitude must be between -180 and 180')
    )
    .optional();

/**
 * Zod schema for hostel creation.
 * Maps to {@code POST /api/admin/hostels} → {@code CreateHostelRequest}.
 *
 * Notes:
 * - {@code imageUrl} is populated after upload — not a user-typed field.
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
    managerId: z.uuid('Invalid manager ID').optional().or(z.literal('')),
});

/**
 * Zod schema for hostel updates.
 * Maps to {@code PUT /api/admin/hostels/{id}} — patch semantics (null fields ignored).
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

/** Form input values (before Zod transforms). */
export type CreateHostelInputValues = z.input<typeof createHostelSchema>;
export type UpdateHostelInputValues = z.input<typeof updateHostelSchema>;

/** Cleaned output values sent to the backend API. */
export type CreateHostelFormValues = z.output<typeof createHostelSchema>;
export type UpdateHostelFormValues = z.output<typeof updateHostelSchema>;

/** Form values for the assign manager dialog. */
export type AssignManagerFormValues = z.infer<typeof assignManagerSchema>;

// =============================================================================
// API payload types
// (Sent to the backend — may differ slightly from form values)
// =============================================================================

/**
 * Request body for {@code POST /api/admin/hostels}.
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
 * All fields optional — patch semantics applied server-side.
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

/** Pagination + filter params for paginated hostel list endpoints. */
export interface HostelPageParams extends PaginationParams {
    search?: string;
    genderPolicy?: GenderPolicy | 'ALL'
}

/**
 * Query params for the hostel sections endpoint.
 * Maps to {@code GET /api/hostels/with-room-sections}.
 */
export interface HostelSectionParams extends PaginationParams {
    search?: string;
    genderPolicy?: GenderPolicy | 'ALL';
    roomType?: string;
    maxPricePerSemester?: number;
}

/**
 * Query params for {@code GET /api/hostels/{id}} detail endpoint.
 * Allows room filtering and pagination alongside the hostel detail.
 */
export interface HostelDetailParams {
    roomType?: string;
    maxPrice?: number;
    page?: number;
    size?: number;
    sort?: string;
}
