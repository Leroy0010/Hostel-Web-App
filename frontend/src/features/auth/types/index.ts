import type { HostelDto } from '@/features/hostel/types/hostel.types';
import { z } from 'zod';

/** The three defined RBAC roles in the system. */
export type UserRole = 'ADMIN' | 'MANAGER' | 'STUDENT';

/**
 * Core user profile — returned by /users/me and embedded in LoginResponse.
 * Maps directly to the Spring Boot `UserProfileDTO`.
 */
export interface ProfileUser {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
}



/**
 * Response shape from GET /users/me.
 * The Axios interceptor unwraps the API envelope so this arrives directly.
 */
export interface MeResponse {
    user: ProfileUser;
    /** Null for students without an active booking, or for ADMIN accounts. */
    hostel: HostelDto;
}

/**
 * Response shape from POST /auth/login.
 * Contains both the short-lived JWT access token and the full profile context.
 */
export interface LoginResponse {
    /** Short-lived JWT — stored in memory via TokenManager. */
    token: string;
    user: MeResponse;
}

/**
 * Minimal response from POST /auth/refresh.
 * The backend also sets / rotates the HttpOnly refresh cookie in this call.
 */
export interface TokenResponse {
    token: string;
}





export const loginSchema = z.object({
    email: z.email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const passwordResetRequestSchema = z.object({
    email: z.email('Invalid email address'),
});

export const passwordResetConfirmSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters'),
    type: z.enum(['activation', 'reset'], {error: "Invalid type"})
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters'),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

export type PasswordResetRequestForm = z.infer<
    typeof passwordResetRequestSchema
>;

export type PasswordResetConfirmForm = z.infer<
    typeof passwordResetConfirmSchema
>;

export type ChangePasswordForm = z.infer<
    typeof changePasswordSchema
>;