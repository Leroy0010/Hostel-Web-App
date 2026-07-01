import { motion } from 'framer-motion';
import { CalendarCheck } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { BookingCard, BookingCardSkeleton } from '../components/BookingCard';
import { useMyBookings } from '../hooks/booking.hooks';
import { useBookingFilters } from '../hooks/useBookingFilters';
import type { BookingStatus } from '../types/booking.types';

// =============================================================================
// Page component
// =============================================================================

/**
 * Student booking history page.
 *
 * Displays all of the authenticated student's bookings, newest first.
 * Supports filtering by booking status (synced to URL search params).
 *
 * States handled (per §8 of agent2.md):
 *  - Loading: skeleton cards
 *  - Error: friendly retry
 *  - Empty: distinct messages for filtered vs unfiltered empty
 *  - Populated: BookingCard list + pagination
 *
 * Route: {@code /bookings/my} — protected, STUDENT only.
 */
export default function StudentBookings() {
    const { filters, page, setFilters, setPage, apiParams } =
        useBookingFilters(10);

    const {
        data: bookingPage,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useMyBookings(apiParams);

    const bookings = bookingPage?.content ?? [];
    const hasFilter = filters.status !== 'ALL';

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
            >
                {/* ── Page header ─────────────────────────────────────── */}
                <PageHeader
                    title="My Bookings"
                    description="Your full booking history and status updates."
                />

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

                    {/* Clear filter */}
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
                        description="There was a problem fetching your booking history. Please try again."
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
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <BookingCardSkeleton key={i} />
                        ))}
                    </div>
                ) : bookings.length === 0 ? (
                    <EmptyState
                        icon={
                            <CalendarCheck className="h-8 w-8 text-gray-400" />
                        }
                        title={
                            hasFilter ? 'No bookings match' : 'No bookings yet'
                        }
                        description={
                            hasFilter
                                ? 'No bookings match the selected status filter.'
                                : 'You have not made any booking requests yet. Browse hostels to get started.'
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
                    <div
                        className={`space-y-3 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
                    >
                        {bookings.map((booking) => (
                            <BookingCard key={booking.id} booking={booking} />
                        ))}
                    </div>
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
