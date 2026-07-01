import { z } from 'zod';
import type { PaginationParams } from '@/types/pagination';

// =============================================================================
// Enums
// =============================================================================

/** Mirrors the backend {@code UserRole} enum exactly. */
export type UserRole = 'ADMIN' | 'MANAGER' | 'STUDENT';

// =============================================================================
// Response DTOs
// =============================================================================

/**
 * Full user record as returned by admin user management endpoints.
 * Mirrors {@code UserDto} on the backend.
 */
export interface UserDto {
    id: string;
    email: string;
    /** Combined "First Last" — the backend exposes this via {@code User.getName()}. */
    name: string;
    phone: string | null;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
}

// =============================================================================
// Query params
// =============================================================================

/**
 * Filter + pagination params for the admin user list.
 * Maps to {@code GET /api/admin/users}.
 */
export interface UserListParams extends PaginationParams {
    role?: UserRole;
    search?: string;
    isActive?: boolean;
}

// =============================================================================
// Zod schema — staff creation form
// =============================================================================

/**
 * Schema for the admin "create staff" form.
 * Maps to {@code POST /api/admin/users} → {@code CreateStaffRequest}.
 *
 * Only MANAGER and ADMIN roles are selectable here — students self-register
 * through the public registration flow.
 */
export const createStaffSchema = z.object({
    firstName: z
        .string()
        .min(1, 'First name is required')
        .max(100, 'First name must not exceed 100 characters')
        .trim(),
    lastName: z
        .string()
        .min(1, 'Last name is required')
        .max(100, 'Last name must not exceed 100 characters')
        .trim(),
    email: z.email('Please enter a valid email address'),
    phone: z
        .string()
        .min(1, 'Phone number is required for staff accounts')
        .max(20, 'Phone number is too long')
        .trim(),
    role: z.enum(['MANAGER', 'ADMIN'], {
        error: 'Please select a role',
    }),
});

export type CreateStaffFormValues = z.infer<typeof createStaffSchema>;

// =============================================================================
// API payload types
// =============================================================================

/** Request body for {@code POST /api/admin/users}. */
export interface CreateStaffPayload {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: 'MANAGER' | 'ADMIN';
}
