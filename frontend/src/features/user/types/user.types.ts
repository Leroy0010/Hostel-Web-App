import type { HostelDto } from "@/features/hostel/types/hostel.types";

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
