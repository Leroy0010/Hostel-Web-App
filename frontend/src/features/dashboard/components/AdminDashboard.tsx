import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    BedDouble,
    Building2,
    CheckCircle2,
    Clock,
    DoorOpen,
    ListOrdered,
    Users,
    Wallet,
    XCircle,
} from 'lucide-react';

// Shadcn UI components
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { transition } from '@/features/auth/utils/transition';
import type {
    AdminDashboard as AdminDashboardData,
    HostelOccupancyDto,
} from '../types/dashboard.types';
import { AdminDashboardSkeleton } from './AdminDashboardSkeleton';

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

interface AdminDashboardProps {
    data?: AdminDashboardData;
    isLoading?: boolean;
}

export function AdminDashboard({ data, isLoading }: AdminDashboardProps) {
    const navigate = useNavigate();

    if (isLoading || !data) {
        return <AdminDashboardSkeleton />;
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* ── Row 1: Infrastructure stats ───────────────────────────── */}
            <motion.div
                variants={itemVariants}
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
                <StatCard
                    icon={<Users className="h-5 w-5" />}
                    label="Total Users"
                    value={data.totalUsers}
                    sub={`${data.totalStudents} students · ${data.totalManagers} managers`}
                    onClick={() => navigate('/admin/users')}
                    clickable
                />
                <StatCard
                    icon={<Building2 className="h-5 w-5" />}
                    label="Hostels"
                    value={data.activeHostels}
                    sub={`${data.totalHostels} total`}
                    onClick={() => navigate('/admin/hostels')}
                    clickable
                />
                <StatCard
                    icon={<BedDouble className="h-5 w-5" />}
                    label="Total Beds"
                    value={data.totalBeds}
                    sub={`${data.availableBeds} available`}
                />
                <StatCard
                    icon={<DoorOpen className="h-5 w-5" />}
                    label="Occupancy"
                    value={`${data.overallOccupancyPct}%`}
                    sub={`${data.occupiedBeds} of ${data.totalBeds} beds`}
                    accent={
                        data.overallOccupancyPct >= 90
                            ? 'red'
                            : data.overallOccupancyPct >= 70
                              ? 'amber'
                              : 'green'
                    }
                />
            </motion.div>

            {/* ── Row 2: Operational alert counters ─────────────────────── */}
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

            {/* ── Row 3: Revenue summary (declared payments only) ────────── */}
            <motion.div variants={itemVariants} className="space-y-3">
                <SectionHeading>Revenue (Declared Payments)</SectionHeading>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard
                        icon={<Wallet className="h-5 w-5" />}
                        label="Total Declared"
                        value={`GH₵${data.revenueSummary.totalDeclared.toLocaleString()}`}
                    />
                    <StatCard
                        icon={<Wallet className="h-5 w-5" />}
                        label="Current Period"
                        value={`GH₵${data.revenueSummary.currentSemester.toLocaleString()}`}
                    />
                    <StatCard
                        icon={<CheckCircle2 className="h-5 w-5" />}
                        label="Paid Bookings"
                        value={data.revenueSummary.paidBookings}
                    />
                    <StatCard
                        icon={<Clock className="h-5 w-5" />}
                        label="Unpaid (Approved)"
                        value={data.revenueSummary.unpaidApproved}
                        accent={
                            data.revenueSummary.unpaidApproved > 0
                                ? 'amber'
                                : 'green'
                        }
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    No real payment is processed — these figures reflect
                    submitted payment references only.
                </p>
            </motion.div>

            {/* ── Hostel occupancy table ─────────────────────────────────── */}
            <motion.div variants={itemVariants} className="space-y-3">
                <SectionHeading>Hostel Occupancy</SectionHeading>
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Hostel</TableHead>
                                    <TableHead>Beds</TableHead>
                                    <TableHead>Occupied</TableHead>
                                    <TableHead>Rate</TableHead>
                                    <TableHead>Pending</TableHead>
                                    <TableHead>Waitlist</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.hostelOccupancy.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            No hostel data available.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.hostelOccupancy.map((h) => (
                                        <OccupancyRow
                                            key={h.hostelId}
                                            hostel={h}
                                        />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </motion.div>

            {/* ── Room type distribution ────────────────────────────────── */}
            <motion.div variants={itemVariants} className="space-y-3">
                <SectionHeading>Room Type Distribution</SectionHeading>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {data.roomTypeBreakdown.length === 0 ? (
                        <p className="col-span-full text-xs text-muted-foreground">
                            No rooms on the system yet.
                        </p>
                    ) : (
                        data.roomTypeBreakdown.map((rt) => {
                            const pct =
                                rt.bedCount > 0
                                    ? Math.round(
                                          (rt.occupiedBeds / rt.bedCount) * 100
                                      )
                                    : 0;
                            return (
                                <Card key={rt.roomType} className="p-3">
                                    <p className="text-xs font-medium text-muted-foreground capitalize">
                                        {rt.roomType.toLowerCase()}
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-foreground tabular-nums">
                                        {rt.roomCount}{' '}
                                        <span className="text-xs font-normal text-muted-foreground">
                                            rooms
                                        </span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {rt.occupiedBeds}/{rt.bedCount} beds (
                                        {pct}%)
                                    </p>
                                </Card>
                            );
                        })
                    )}
                </div>
            </motion.div>

            {/* ── Bottom row: Funnel + Complaints ───────────────────────── */}
            <motion.div
                variants={itemVariants}
                className="grid gap-4 lg:grid-cols-2"
            >
                {/* Booking funnel */}
                <div className="space-y-3">
                    <SectionHeading>Booking Pipeline</SectionHeading>
                    <Card className="space-y-2 p-4">
                        {[
                            {
                                label: 'Pending',
                                value: data.bookingFunnel.pending,
                                icon: (
                                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                                ),
                                color: 'bg-amber-400',
                            },
                            {
                                label: 'Approved',
                                value: data.bookingFunnel.approved,
                                icon: (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                                ),
                                color: 'bg-blue-400',
                            },
                            {
                                label: 'Checked In',
                                value: data.bookingFunnel.checkedIn,
                                icon: (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                ),
                                color: 'bg-green-400',
                            },
                            {
                                label: 'Checked Out',
                                value: data.bookingFunnel.checkedOut,
                                icon: (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                ),
                                color: 'bg-muted-foreground/40',
                            },
                            {
                                label: 'Rejected',
                                value: data.bookingFunnel.rejected,
                                icon: (
                                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                                ),
                                color: 'bg-red-400',
                            },
                            {
                                label: 'Cancelled',
                                value: data.bookingFunnel.cancelled,
                                icon: (
                                    <XCircle className="h-3.5 w-3.5 text-red-300" />
                                ),
                                color: 'bg-red-300',
                            },
                        ].map(({ label, value, icon, color }) => {
                            const pct =
                                data.bookingFunnel.total > 0
                                    ? Math.round(
                                          (value / data.bookingFunnel.total) *
                                              100
                                      )
                                    : 0;
                            return (
                                <div key={label} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5 text-muted-foreground">
                                            {icon}
                                            {label}
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            {value.toLocaleString()}{' '}
                                            <span className="font-normal text-muted-foreground">
                                                ({pct}%)
                                            </span>
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                        <div
                                            className={`h-full rounded-full ${color} transition-all duration-500`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        <p className="pt-1 text-right text-xs text-muted-foreground">
                            {data.bookingFunnel.total.toLocaleString()} total
                            bookings
                        </p>
                    </Card>
                </div>

                {/* Complaint summary */}
                <div className="space-y-3">
                    <SectionHeading>Complaint Summary</SectionHeading>
                    <Card className="p-4">
                        {/* Status chips */}
                        <div className="mb-4 grid grid-cols-2 gap-2">
                            {[
                                {
                                    label: 'Open',
                                    value: data.complaintSummary.totalOpen,
                                    color: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400',
                                },
                                {
                                    label: 'In Progress',
                                    value: data.complaintSummary
                                        .totalInProgress,
                                    color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400',
                                },
                                {
                                    label: 'Resolved',
                                    value: data.complaintSummary.totalResolved,
                                    color: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400',
                                },
                                {
                                    label: 'Closed',
                                    value: data.complaintSummary.totalClosed,
                                    color: 'border-border bg-muted text-muted-foreground',
                                },
                            ].map(({ label, value, color }) => (
                                <div
                                    key={label}
                                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${color}`}
                                >
                                    <span className="text-xs font-medium">
                                        {label}
                                    </span>
                                    <span className="text-sm font-bold">
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Category breakdown */}
                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            By Category
                        </p>
                        <div className="space-y-1.5">
                            {data.complaintSummary.byCategory.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    No complaints yet.
                                </p>
                            ) : (
                                data.complaintSummary.byCategory.map((c) => (
                                    <div
                                        key={c.category}
                                        className="flex items-center justify-between text-xs"
                                    >
                                        <span className="text-muted-foreground capitalize">
                                            {c.category
                                                .toLowerCase()
                                                .replace('_', ' ')}
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {c.count}{' '}
                                            {c.openCount > 0 && (
                                                <span className="text-red-500">
                                                    ({c.openCount} open)
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </motion.div>

            {/* ── Waitlist depth ────────────────────────────────────────── */}
            {data.waitlistDepth.some((w) => w.queueDepth > 0) && (
                <motion.div variants={itemVariants} className="space-y-3">
                    <SectionHeading>Waitlist Queue Depth</SectionHeading>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {data.waitlistDepth
                            .filter((w) => w.queueDepth > 0)
                            .map((w) => (
                                <Card
                                    key={w.hostelId}
                                    className="flex items-center justify-between px-4 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-foreground">
                                            {w.hostelName}
                                        </p>
                                    </div>
                                    <span className="ml-3 shrink-0 text-lg font-bold text-foreground">
                                        {w.queueDepth}
                                    </span>
                                </Card>
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

function StatCard({
    icon,
    label,
    value,
    sub,
    accent,
    onClick,
    clickable,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    sub?: string;
    accent?: 'green' | 'amber' | 'red';
    onClick?: () => void;
    clickable?: boolean;
}) {
    const accentText =
        accent === 'green'
            ? 'text-green-600 dark:text-green-400'
            : accent === 'amber'
              ? 'text-amber-600 dark:text-amber-400'
              : accent === 'red'
                ? 'text-red-600 dark:text-red-400'
                : 'text-foreground';

    return (
        <Card
            onClick={onClick}
            className={`group transition-all ${
                clickable
                    ? 'cursor-pointer hover:bg-muted/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                    : 'cursor-default'
            }`}
        >
            <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {icon}
                    <span className="text-xs font-medium">{label}</span>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${accentText}`}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </CardContent>
        </Card>
    );
}

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
        red: 'border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/20',
        blue: 'border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/20',
    };
    const textColors = {
        amber: 'text-amber-700 dark:text-amber-300',
        red: 'text-red-700 dark:text-red-300',
        blue: 'text-blue-700 dark:text-blue-300',
    };

    return (
        <Card
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1.5 p-4 text-center transition-colors ${colors[color]} ${
                onClick
                    ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-ring'
                    : 'cursor-default'
            }`}
        >
            <span className={textColors[color]}>{icon}</span>
            <p
                className={`text-2xl font-bold tabular-nums ${textColors[color]}`}
            >
                {value.toLocaleString()}
            </p>
            <p className={`text-xs font-medium ${textColors[color]}`}>
                {label}
            </p>
        </Card>
    );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {children}
        </h2>
    );
}

function OccupancyRow({ hostel }: { hostel: HostelOccupancyDto }) {
    const pct = hostel.occupancyPct;
    const barColor =
        pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-green-400';

    return (
        <TableRow className="hover:bg-muted/50">
            <TableCell className="font-medium">{hostel.hostelName}</TableCell>
            <TableCell className="text-muted-foreground">
                {hostel.totalBeds}
            </TableCell>
            <TableCell className="text-muted-foreground">
                {hostel.occupiedBeds}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                        <div
                            className={`h-full rounded-full ${barColor} transition-all duration-500`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                        {pct}%
                    </span>
                </div>
            </TableCell>
            <TableCell>
                {hostel.pendingBookings > 0 ? (
                    <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                    >
                        {hostel.pendingBookings}
                    </Badge>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                )}
            </TableCell>
            <TableCell className="text-muted-foreground">
                {hostel.waitlistCount > 0 ? hostel.waitlistCount : '—'}
            </TableCell>
        </TableRow>
    );
}
