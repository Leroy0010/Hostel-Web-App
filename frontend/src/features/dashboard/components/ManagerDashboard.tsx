import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    BedDouble,
    Building2,
    ChevronRight,
    Clock,
    ListOrdered,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { transition } from '@/features/auth/utils/transition';
import type {
    ManagerDashboard as ManagerDashboardData,
    ManagerHostelCard,
} from '../types/dashboard.types';
import { ManagerDashboardSkeleton } from './ManagerDashboardSkeleton';

// =============================================================================
// Animation
// =============================================================================

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition },
};

// =============================================================================
// Component
// =============================================================================

interface ManagerDashboardProps {
    data?: ManagerDashboardData;
    isLoading?: boolean
}

/**
 * Manager dashboard — scoped to the authenticated manager's assigned hostels.
 *
 * Sections:
 *  1. Summary counters — pending bookings, open complaints, waitlisted
 *     (aggregated across all the manager's hostels).
 *  2. Per-hostel cards — occupancy, pending count, complaint count, waitlist
 *     count for each individually managed hostel. Cards link to the relevant
 *     management page (rooms, bookings, complaints, waitlist).
 *
 * Empty state shown if the manager has no hostels assigned yet.
 */
export function ManagerDashboard({ data, isLoading }: ManagerDashboardProps) {
    const navigate = useNavigate();

    if (isLoading || !data) {
        return <ManagerDashboardSkeleton />;
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* ── Summary counters ──────────────────────────────────────── */}
            <motion.div
                variants={itemVariants}
                className="grid grid-cols-3 gap-3"
            >
                <AlertCard
                    icon={<Clock className="h-4 w-4" />}
                    label="Pending Bookings"
                    value={data.pendingBookings}
                    color="amber"
                    onClick={() => navigate('/manager/bookings/pending')}
                />
                <AlertCard
                    icon={<AlertTriangle className="h-4 w-4" />}
                    label="Open Complaints"
                    value={data.openComplaints}
                    color="red"
                />
                <AlertCard
                    icon={<ListOrdered className="h-4 w-4" />}
                    label="Waitlisted"
                    value={data.totalWaitlisted}
                    color="blue"
                />
            </motion.div>

            {/* ── Per-hostel cards ──────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    My Hostels
                </h2>

                {data.hostels.length === 0 ? (
                    <EmptyState
                        icon={<Building2 className="h-8 w-8 text-gray-400" />}
                        title="No hostels assigned"
                        description="You have no hostels assigned to your account yet. Contact an admin to get assigned."
                    />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {data.hostels.map((hostel) => (
                            <HostelCard
                                key={hostel.hostelId}
                                hostel={hostel}
                                onClick={() =>
                                    navigate(
                                        `/manager/hostels/${hostel.hostelId}/rooms`
                                    )
                                }
                            />
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================

/** Alert counter card for cross-hostel summary metrics. */
function AlertCard({
    icon,
    label,
    value,
    color,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: 'amber' | 'red' | 'blue';
    onClick?: () => void;
}) {
    const colors = {
        amber: 'border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20',
        red:   'border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/20',
        blue:  'border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/20',
    };
    const textColors = {
        amber: 'text-amber-700 dark:text-amber-300',
        red:   'text-red-700 dark:text-red-300',
        blue:  'text-blue-700 dark:text-blue-300',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 text-center ${colors[color]} ${onClick ? 'cursor-pointer hover:opacity-80 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none' : 'cursor-default'}`}
        >
            <span className={textColors[color]}>{icon}</span>
            <p className={`text-2xl font-bold tabular-nums ${textColors[color]}`}>
                {value.toLocaleString()}
            </p>
            <p className={`text-xs font-medium ${textColors[color]}`}>{label}</p>
        </button>
    );
}

/**
 * Per-hostel summary card. Clicking navigates to the rooms management page
 * for that hostel — the most common manager action.
 */
function HostelCard({
    hostel,
    onClick,
}: {
    hostel: ManagerHostelCard;
    onClick: () => void;
}) {
    const pct = hostel.occupancyPct;
    const barColor =
        pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-green-400';

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none dark:border-gray-800 dark:bg-gray-950"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 truncate font-semibold text-gray-900 dark:text-gray-100">
                    {hostel.hostelName}
                </h3>
                <ChevronRight
                    className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400"
                    aria-hidden="true"
                />
            </div>

            {/* Occupancy bar */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                        <BedDouble className="h-3 w-3" aria-hidden="true" />
                        {hostel.occupiedBeds} / {hostel.totalBeds} beds
                    </span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {pct}%
                    </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                        className={`h-full rounded-full ${barColor} transition-all duration-500`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                </div>
            </div>

            {/* Counters row */}
            <div className="flex items-center gap-3 border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
                <CounterChip
                    label="Pending"
                    value={hostel.pendingBookings}
                    active={hostel.pendingBookings > 0}
                    color="amber"
                />
                <CounterChip
                    label="Complaints"
                    value={hostel.openComplaints}
                    active={hostel.openComplaints > 0}
                    color="red"
                />
                <CounterChip
                    label="Waitlist"
                    value={hostel.waitlistCount}
                    active={hostel.waitlistCount > 0}
                    color="blue"
                />
            </div>
        </button>
    );
}

/** Small inline counter chip for the hostel card footer. */
function CounterChip({
    label,
    value,
    active,
    color,
}: {
    label: string;
    value: number;
    active: boolean;
    color: 'amber' | 'red' | 'blue';
}) {
    const activeColors = {
        amber: 'text-amber-600 dark:text-amber-400',
        red: 'text-red-600 dark:text-red-400',
        blue: 'text-blue-600 dark:text-blue-400',
    };

    return (
        <span
            className={`flex items-center gap-1 ${active ? activeColors[color] : 'text-gray-400 dark:text-gray-600'}`}
        >
            <span className="font-semibold">{value}</span>
            {label}
        </span>
    );
}