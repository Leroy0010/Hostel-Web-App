/**
 * TypeScript types for the role-specific dashboard feature.
 *
 * The backend returns a sealed interface discriminated by a {@code "role"} field.
 * TypeScript's discriminated union narrows the type automatically in switch/if blocks:
 *
 * @example
 * ```ts
 * if (data.role === 'ADMIN') {
 *   data.bookingFunnel // ✓ typed as BookingFunnelDto
 * }
 * ```
 */

import type { RoomType } from '@/features/room/types/room.types';

// =============================================================================
// Shared / embedded types
// =============================================================================

/**
 * Booking pipeline counts — how requests move through the system.
 * Mirrors {@code BookingFunnelDto} from the analytics module.
 */
export interface BookingFunnelDto {
    pending: number;
    approved: number;
    rejected: number;
    checkedIn: number;
    checkedOut: number;
    cancelled: number;
    total: number;
}

/**
 * Per-hostel occupancy metrics.
 * Mirrors {@code HostelOccupancyDto} from the analytics module.
 */
export interface HostelOccupancyDto {
    hostelId: string;
    hostelName: string;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    occupancyPct: number;
    waitlistCount: number;
    pendingBookings: number;
}

/** Waitlist queue depth per hostel. Mirrors {@code WaitlistDepthDto}. */
export interface WaitlistDepthDto {
    hostelId: string;
    hostelName: string;
    queueDepth: number;
}

/** Complaint counts by status and category. Mirrors {@code ComplaintSummaryDto}. */
export interface ComplaintSummaryDto {
    totalOpen: number;
    totalInProgress: number;
    totalResolved: number;
    totalClosed: number;
    byCategory: Array<{
        category: string;
        count: number;
        openCount: number;
    }>;
}

export interface RoomTypeBreakdown {
    roomType: RoomType;
    roomCount: number;
    bedCount: number;
    occupiedBeds: number;
}

export interface RevenueSummary {
    totalDeclared: number;
    currentSemester: number;
    paidBookings: number;
    unpaidApproved: number;
}

// =============================================================================
// ADMIN dashboard
// =============================================================================

/**
 * Full system-wide dashboard for ADMIN users.
 * Returned when the authenticated user has the ADMIN role.
 */
export interface AdminDashboard {
    role: 'ADMIN';
    // ── User metrics ─────────────────────────────────────
    totalUsers: number;
    totalStudents: number;
    totalManagers: number;
    // ── Infrastructure metrics ───────────────────────────
    totalHostels: number;
    activeHostels: number;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    overallOccupancyPct: number;
    // ── Operational metrics ──────────────────────────────
    pendingBookings: number;
    openComplaints: number;
    totalWaitlisted: number;
    // ── Detail tables ────────────────────────────────────
    hostelOccupancy: HostelOccupancyDto[];
    bookingFunnel: BookingFunnelDto;
    complaintSummary: ComplaintSummaryDto;
    waitlistDepth: WaitlistDepthDto[];
    roomTypeBreakdown: RoomTypeBreakdown[];
    revenueSummary: RevenueSummary;
}

// =============================================================================
// MANAGER dashboard
// =============================================================================

/**
 * Per-hostel summary card shown in the manager dashboard.
 * Scoped to one of the manager's assigned hostels.
 */
export interface ManagerHostelCard {
    hostelId: string;
    hostelName: string;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    occupancyPct: number;
    pendingBookings: number;
    openComplaints: number;
    waitlistCount: number;
}

/**
 * Scoped dashboard for MANAGER users — only their assigned hostels.
 * Returned when the authenticated user has the MANAGER role.
 */
export interface ManagerDashboard {
    role: 'MANAGER';
    pendingBookings: number;
    openComplaints: number;
    totalWaitlisted: number;
    hostels: ManagerHostelCard[];
}

// =============================================================================
// STUDENT dashboard
// =============================================================================

/** Current accommodation card — non-null when the student is CHECKED_IN. */
export interface StudentCurrentHostel {
    hostelName: string;
    hostelAddress: string;
    roomNumber: string;
    roomType: string;
    checkedInAt: string;
}

/** Compact booking summary for the student activity feed. */
export interface StudentBookingSummary {
    bookingId: string;
    hostelName: string;
    roomNumber: string;
    status: string;
    academicYear: string;
    semester: string;
    requestedAt: string;
}

/** Waitlist position entry for the student dashboard. */
export interface StudentWaitlistEntry {
    waitlistId: string;
    hostelId: string;
    hostelName: string;
    roomType: string;
    position: number;
    academicYear: string;
    semester: string;
}

/**
 * Personal dashboard for STUDENT users.
 * Returned when the authenticated user has the STUDENT role.
 */
export interface StudentDashboard {
    role: 'STUDENT';
    totalBookings: number;
    activeBookings: number;
    checkedIn: number;
    waitlistCount: number;
    /** Null when the student is not currently residing in any room. */
    currentHostel: StudentCurrentHostel | null;
    recentBookings: StudentBookingSummary[];
    waitlistEntries: StudentWaitlistEntry[];
}

// =============================================================================
// Union type
// =============================================================================

/**
 * The discriminated union returned by {@code GET /api/dashboard}.
 * Narrow using the {@code role} field.
 */
export type DashboardData =
    AdminDashboard | ManagerDashboard | StudentDashboard;
