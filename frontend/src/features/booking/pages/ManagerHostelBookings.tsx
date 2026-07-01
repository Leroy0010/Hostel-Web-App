import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    CalendarCheck,
    Building2,
    DoorOpen,
    ChevronRight,
    User,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { BookingStatusBadge } from '../components/BookingStatusBadge';
import { useHostelBookings } from '../hooks/booking.hooks';
import { useBookingFilters } from '../hooks/useBookingFilters';
import { formatDateTime, semesterLabel } from '../utils/booking.utils';
import type { BookingStatus } from '../types/booking.types';
import { BookingCardSkeleton } from '../components/BookingCard';
import { ManagerBookingCard } from '../components/ManagerBookingCard';

// =============================================================================
// Page component
// =============================================================================

/**
 * Manager/Admin: all bookings for a specific hostel.
 *
 * Features:
 *  - Paginated table of bookings with optional status filter.
 *  - Status filter synced to URL search params via {@link useBookingFilters}.
 *  - Each row navigates to the full booking detail page.
 *  - Full loading, error, and empty states.
 *
 * Route: {@code /manager/hostels/:hostelId/bookings} — protected, MANAGER + ADMIN.
 *
 * Note: despite the `/admin/` path in the API call, the backend allows MANAGER
 * access too ({@code @PreAuthorize("hasRole('MANAGER')")} on that endpoint).
 */
export default function ManagerHostelBookingsPage() {
    const { hostelId } = useParams<{ hostelId: string }>();
    const navigate = useNavigate();

    const { filters, page, setFilters, setPage, apiParams } =
        useBookingFilters(20);

    const {
        data: bookingPage,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useHostelBookings(hostelId, apiParams);

    const bookings = bookingPage?.content ?? [];
    const hasFilter = filters.status !== 'ALL';

    if (!hostelId) {
        return (
            <EmptyState
                icon={<Building2 className="h-8 w-8 text-gray-400" />}
                title="No hostel selected"
                description="Navigate to a hostel to view its bookings."
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/manager/hostels')}
                    >
                        Go back
                    </Button>
                }
            />
        );
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
            >
                {/* ── Back + header ────────────────────────────────────── */}
                <div className="space-y-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="gap-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Back
                    </Button>
                    <PageHeader
                        title="Hostel Bookings"
                        description="All bookings for this hostel."
                    />
                </div>

                {/* ── Status filter ────────────────────────────────────── */}
                <div className="flex items-center gap-2">
                    <div className="w-48">
                        <Select
                            value={filters.status}
                            onValueChange={(val) =>
                                setFilters({
                                    status: val as BookingStatus | 'ALL',
                                })
                            }
                        >
                            <SelectTrigger className="border-gray-200 bg-white text-gray-900 focus:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-600">
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                                <SelectItem value="ALL">
                                    All statuses
                                </SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="APPROVED">
                                    Approved
                                </SelectItem>
                                <SelectItem value="CHECKED_IN">
                                    Checked In
                                </SelectItem>
                                <SelectItem value="CHECKED_OUT">
                                    Checked Out
                                </SelectItem>
                                <SelectItem value="REJECTED">
                                    Rejected
                                </SelectItem>
                                <SelectItem value="CANCELLED">
                                    Cancelled
                                </SelectItem>
                                <SelectItem value="EXPIRED">Expired</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {hasFilter && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilters({ status: 'ALL' })}
                            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        >
                            Clear
                        </Button>
                    )}
                </div>

                {/* ── Content ──────────────────────────────────────────── */}
                {isError ? (
                    <EmptyState
                        icon={
                            <CalendarCheck className="h-8 w-8 text-gray-400" />
                        }
                        title="Could not load bookings"
                        description="There was a problem fetching booking data. Please try again."
                        action={
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                            >
                                Retry
                            </Button>
                        }
                    />
                ) : isLoading ? (
                    <>
                        {/* Mobile */}
                        <div className="space-y-3 md:hidden">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <BookingCardSkeleton key={index} />
                            ))}
                        </div>

                        {/* Desktop */}
                        <div className="hidden md:block">
                            <BookingsTableSkeleton />
                        </div>
                    </>
                ) : bookings.length === 0 ? (
                    <EmptyState
                        icon={
                            <CalendarCheck className="h-8 w-8 text-gray-400" />
                        }
                        title="No bookings found"
                        description={
                            hasFilter
                                ? 'No bookings match the selected status filter.'
                                : 'This hostel has no bookings yet.'
                        }
                        action={
                            hasFilter ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setFilters({ status: 'ALL' })
                                    }
                                >
                                    Clear filter
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        {/* Mobile Cards */}
                        <div className="space-y-3 md:hidden">
                            <AnimatePresence mode="popLayout">
                                {bookings.map((booking) => (
                                    <motion.div
                                        key={booking.id}
                                        layout
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ManagerBookingCard booking={booking} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Desktop Table */}
                        <div
                            className={`hidden overflow-hidden rounded-xl border border-gray-200 bg-white transition-opacity duration-200 md:block dark:border-gray-800 dark:bg-gray-950 ${
                                isFetching ? 'opacity-60' : 'opacity-100'
                            }`}
                        >
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-900/50">
                                        <Th>Student</Th>
                                        <Th>Room</Th>
                                        <Th>Period</Th>
                                        <Th>Status</Th>
                                        <Th>Requested</Th>
                                        <Th className="w-10" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    <AnimatePresence mode="popLayout">
                                        {bookings.map((booking) => (
                                            <motion.tr
                                                key={booking.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40"
                                                onClick={() =>
                                                    navigate(
                                                        `/bookings/${booking.id}`
                                                    )
                                                }
                                            >
                                                {/* Student */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <User
                                                            className="h-4 w-4 shrink-0 text-gray-400"
                                                            aria-hidden="true"
                                                        />
                                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                                            {
                                                                booking.studentName
                                                            }
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Room */}
                                                <td className="px-4 py-3">
                                                    <p className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        <DoorOpen
                                                            className="h-3.5 w-3.5 text-gray-400"
                                                            aria-hidden="true"
                                                        />
                                                        {booking.roomNumber}
                                                    </p>
                                                </td>

                                                {/* Period */}
                                                <td className="px-4 py-3 text-sm">
                                                    <p className="text-gray-800 dark:text-gray-200">
                                                        {booking.academicYear}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {semesterLabel(
                                                            booking.semester
                                                        )}
                                                    </p>
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-3">
                                                    <BookingStatusBadge
                                                        status={booking.status}
                                                    />
                                                </td>

                                                {/* Requested at */}
                                                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDateTime(
                                                        booking.requestedAt
                                                    )}
                                                </td>

                                                {/* Chevron */}
                                                <td className="px-4 py-3">
                                                    <ChevronRight
                                                        className="h-4 w-4 text-gray-300 dark:text-gray-700"
                                                        aria-hidden="true"
                                                    />
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* ── Pagination ──────────────────────────────────────── */}
                {bookingPage && bookingPage.totalPages > 1 && (
                    <Pagination
                        currentPage={page}
                        totalPages={bookingPage.totalPages}
                        totalElements={bookingPage.totalElements}
                        onPageChange={setPage}
                        isLoading={isFetching}
                    />
                )}
            </motion.div>
        </>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================

function Th({
    children,
    className = '',
}: {
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <th
            scope="col"
            className={`px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400 ${className}`}
        >
            {children}
        </th>
    );
}

function BookingsTableSkeleton() {
    return (
        <div
            className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
            aria-hidden="true"
        >
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                        <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                        <div className="ml-auto h-3 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                ))}
            </div>
        </div>
    );
}
