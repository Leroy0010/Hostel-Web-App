import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Building2,
    CalendarCheck,
    ChevronRight,
    Clock,
    Home,
    ListOrdered,
    MapPin,
    Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookingStatusBadge } from '@/features/booking/components/BookingStatusBadge';
import { WaitlistPositionBadge } from '@/features/waitlist/components/WaitlistPositionBadge';
import {
    roomTypeLabel,
    semesterLabel,
} from '@/features/waitlist/utils/waitlist.utils';
import { transition } from '@/features/auth/utils/transition';
import type { StudentDashboard as StudentDashboardData } from '../types/dashboard.types';
import type { BookingStatus } from '@/features/booking/types/booking.types';
import { StudentDashboardSkeleton } from './StudentDashboardSkeleton';

// =============================================================================
// Animation
// =============================================================================

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition },
};

// =============================================================================
// Component
// =============================================================================

interface StudentDashboardProps {
    data?: StudentDashboardData;
    isLoading?: boolean;
}

/**
 * Student dashboard — personal accommodation overview.
 *
 * Sections:
 *  1. Quick stat row — total bookings, active, checked-in, waitlisted.
 *  2. Current accommodation card — shown only when CHECKED_IN somewhere.
 *  3. Recent bookings list — up to 5 most recent, links to detail page.
 *  4. Waitlist positions — all current queue entries with position badges.
 *
 * Empty states guide the student toward browsing hostels when they have
 * no bookings or waitlist entries yet.
 */
export function StudentDashboard({ data, isLoading }: StudentDashboardProps) {
    const navigate = useNavigate();

    if (isLoading || !data) return <StudentDashboardSkeleton />;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* ── Quick stats ───────────────────────────────────────────── */}
            <motion.div
                variants={itemVariants}
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
                <StatChip
                    icon={<CalendarCheck className="h-4 w-4" />}
                    label="Total Bookings"
                    value={data.totalBookings}
                />
                <StatChip
                    icon={<Clock className="h-4 w-4" />}
                    label="Active"
                    value={data.activeBookings}
                />
                <StatChip
                    icon={<Home className="h-4 w-4" />}
                    label="Checked In"
                    value={data.checkedIn}
                />
                <StatChip
                    icon={<ListOrdered className="h-4 w-4" />}
                    label="Waitlisted"
                    value={data.waitlistCount}
                />
            </motion.div>

            {/* ── Current accommodation ─────────────────────────────────── */}
            {data.currentHostel && (
                <motion.div
                    variants={itemVariants}
                    className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                >
                    <div className="flex items-start justify-between gap-3 p-4">
                        <div className="space-y-1">
                            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
                                <Home
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                />
                                Current Accommodation
                            </p>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {data.currentHostel.hostelName}
                            </h3>
                            <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <MapPin
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                {data.currentHostel.hostelAddress}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Room {data.currentHostel.roomNumber} ·{' '}
                                {roomTypeLabel(
                                    data.currentHostel.roomType as never
                                )}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Recent bookings ───────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Recent Bookings
                    </h2>
                    {data.recentBookings.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/student/bookings')}
                            className="h-7 gap-1 px-2 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        >
                            View all
                            <ChevronRight
                                className="h-3 w-3"
                                aria-hidden="true"
                            />
                        </Button>
                    )}
                </div>

                {data.recentBookings.length === 0 ? (
                    <EmptyState
                        icon={
                            <CalendarCheck className="h-8 w-8 text-gray-400" />
                        }
                        title="No bookings yet"
                        description="Browse hostels to find your accommodation."
                        action={
                            <Button
                                size="sm"
                                onClick={() => navigate('/hostels')}
                                className="gap-1.5 bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                            >
                                <Search
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                />
                                Browse Hostels
                            </Button>
                        }
                    />
                ) : (
                    <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950">
                        {data.recentBookings.map((booking) => (
                            <button
                                key={booking.bookingId}
                                type="button"
                                onClick={() =>
                                    navigate(`/bookings/${booking.bookingId}`)
                                }
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/40"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {booking.hostelName} · Room{' '}
                                        {booking.roomNumber}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {booking.academicYear} ·{' '}
                                        {semesterLabel(
                                            booking.semester as never
                                        )}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <BookingStatusBadge
                                        status={booking.status as BookingStatus}
                                    />
                                    <ChevronRight
                                        className="h-4 w-4 text-gray-300 dark:text-gray-700"
                                        aria-hidden="true"
                                    />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* ── Waitlist positions ────────────────────────────────────── */}
            {data.waitlistEntries.length > 0 && (
                <motion.div variants={itemVariants} className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Waitlist Positions
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/student/waitlist')}
                            className="h-7 gap-1 px-2 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        >
                            View all
                            <ChevronRight
                                className="h-3 w-3"
                                aria-hidden="true"
                            />
                        </Button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                        {data.waitlistEntries.map((entry) => (
                            <button
                                key={entry.waitlistId}
                                type="button"
                                onClick={() =>
                                    navigate(`/hostels/${entry.hostelId}`)
                                }
                                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {entry.hostelName}
                                    </p>
                                    <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <Building2
                                            className="h-3 w-3"
                                            aria-hidden="true"
                                        />
                                        {roomTypeLabel(entry.roomType as never)}{' '}
                                        · {entry.academicYear}
                                    </p>
                                </div>
                                <WaitlistPositionBadge
                                    position={entry.position}
                                    compact
                                />
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================

/** Compact quick-stat chip for the top row. */
function StatChip({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
}) {
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                {icon}
                <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums dark:text-gray-100">
                {value.toLocaleString()}
            </p>
        </div>
    );
}
