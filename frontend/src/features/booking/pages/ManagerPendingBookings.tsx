import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    CalendarCheck,
    Building2,
    DoorOpen,
    User,
    RefreshCcw,
    ChevronRight,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

import { ActionBookingForm } from '../components/ActionBookingForm';
import { usePendingBookings } from '../hooks/booking.hooks';
import { formatDateTime, semesterLabel } from '../utils/booking.utils';
import type { BookingSummaryDto } from '../types/booking.types';

// Create a motion-enabled TableRow for desktop animations
const MotionTableRow = motion(TableRow);

// =============================================================================
// Page component
// =============================================================================

export default function ManagerPendingBookings() {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [actionBooking, setActionBooking] =
        useState<BookingSummaryDto | null>(null);

    const {
        data: bookingPage,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = usePendingBookings({ page, size: 20 });

    const bookings = bookingPage?.content ?? [];

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
                    title="Pending Bookings"
                    description="Booking requests awaiting your approval — oldest first."
                    actions={
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="gap-1.5"
                        >
                            {isFetching ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            ) : (
                                <RefreshCcw className="h-3.5 w-3.5" />
                            )}
                            Refresh
                        </Button>
                    }
                />

                {/* ── Content ──────────────────────────────────────────── */}
                {isError ? (
                    <EmptyState
                        icon={
                            <CalendarCheck className="h-8 w-8 text-muted-foreground" />
                        }
                        title="Could not load pending bookings"
                        description="There was a problem fetching the booking queue. Please try again."
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
                    <PendingQueueSkeleton />
                ) : bookings.length === 0 ? (
                    <EmptyState
                        icon={
                            <CalendarCheck className="h-8 w-8 text-muted-foreground" />
                        }
                        title="Queue is empty"
                        description="There are no pending booking requests at this time. Check back later."
                    />
                ) : (
                    <div
                        className={`transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
                    >
                        {/* ── Desktop View (Table) ──────────────────────────────── */}
                        <div className="hidden rounded-xl border bg-card md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead>Student</TableHead>
                                        <TableHead>Room</TableHead>
                                        <TableHead>Period</TableHead>
                                        <TableHead>Requested</TableHead>
                                        <TableHead className="text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence mode="popLayout">
                                        {bookings.map((booking) => (
                                            <MotionTableRow
                                                key={booking.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                {/* Student */}
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                                            <User
                                                                className="h-4 w-4 text-muted-foreground"
                                                                aria-hidden="true"
                                                            />
                                                        </div>
                                                        <span className="text-sm font-medium">
                                                            {
                                                                booking.studentName
                                                            }
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Room */}
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <p className="flex items-center gap-1 font-medium">
                                                            <DoorOpen
                                                                className="h-3.5 w-3.5 text-muted-foreground"
                                                                aria-hidden="true"
                                                            />
                                                            Room{' '}
                                                            {booking.roomNumber}
                                                        </p>
                                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Building2
                                                                className="h-3 w-3"
                                                                aria-hidden="true"
                                                            />
                                                            {booking.hostelName}
                                                        </p>
                                                    </div>
                                                </TableCell>

                                                {/* Period */}
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <p className="font-medium">
                                                            {
                                                                booking.academicYear
                                                            }
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {semesterLabel(
                                                                booking.semester
                                                            )}
                                                        </p>
                                                    </div>
                                                </TableCell>

                                                {/* Requested at */}
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {formatDateTime(
                                                        booking.requestedAt
                                                    )}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/bookings/${booking.id}`
                                                                )
                                                            }
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            title="View detail"
                                                        >
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                setActionBooking(
                                                                    booking
                                                                )
                                                            }
                                                            className="h-8"
                                                        >
                                                            Action
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </MotionTableRow>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>

                        {/* ── Mobile View (Cards) ───────────────────────────────── */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            <AnimatePresence mode="popLayout">
                                {bookings.map((booking) => (
                                    <motion.div
                                        key={booking.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Card className="overflow-hidden">
                                            <CardContent className="flex flex-col gap-4 p-4">
                                                {/* Header: Student & Date */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                                                            <User
                                                                className="h-5 w-5 text-muted-foreground"
                                                                aria-hidden="true"
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm leading-none font-medium">
                                                                {
                                                                    booking.studentName
                                                                }
                                                            </p>
                                                            <p className="mt-1.5 text-xs text-muted-foreground">
                                                                {formatDateTime(
                                                                    booking.requestedAt
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Body: Room & Period Details */}
                                                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/50 bg-muted/40 p-3 text-sm">
                                                    <div>
                                                        <p className="mb-1 text-xs text-muted-foreground">
                                                            Room Details
                                                        </p>
                                                        <p className="flex items-center gap-1 font-medium">
                                                            <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {booking.roomNumber}
                                                        </p>
                                                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                                            <Building2 className="h-3 w-3" />
                                                            {booking.hostelName}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="mb-1 text-xs text-muted-foreground">
                                                            Academic Period
                                                        </p>
                                                        <p className="font-medium">
                                                            {
                                                                booking.academicYear
                                                            }
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {semesterLabel(
                                                                booking.semester
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 pt-2">
                                                    <Button
                                                        variant="outline"
                                                        className="h-9 flex-1 text-xs"
                                                        onClick={() =>
                                                            navigate(
                                                                `/bookings/${booking.id}`
                                                            )
                                                        }
                                                    >
                                                        View Details
                                                    </Button>
                                                    <Button
                                                        className="h-9 flex-1 text-xs"
                                                        onClick={() =>
                                                            setActionBooking(
                                                                booking
                                                            )
                                                        }
                                                    >
                                                        Action Booking
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
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

            {/* ── Action dialog ────────────────────────────────────────── */}
            {actionBooking && (
                <Dialog
                    open
                    onOpenChange={(open) => !open && setActionBooking(null)}
                >
                    <DialogContent className="max-w-md scrollbar-none sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Action Booking</DialogTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {actionBooking.studentName} · Room{' '}
                                {actionBooking.roomNumber} ·{' '}
                                {actionBooking.hostelName}
                            </p>
                        </DialogHeader>
                        <ActionBookingForm
                            bookingId={actionBooking.id}
                            roomId={actionBooking.roomId}
                            onSuccess={() => setActionBooking(null)}
                            onCancel={() => setActionBooking(null)}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================

function PendingQueueSkeleton() {
    return (
        <>
            {/* Desktop Skeleton */}
            <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead>Student</TableHead>
                            <TableHead>Room</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Requested</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                                        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-2">
                                        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                                        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-2">
                                        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                                        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
                                        <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Skeleton */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                        <CardContent className="flex flex-col gap-4 p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                                </div>
                            </div>
                            <div className="h-16 animate-pulse rounded-lg border border-border/50 bg-muted/40" />
                            <div className="flex gap-2">
                                <div className="h-9 flex-1 animate-pulse rounded-md bg-muted" />
                                <div className="h-9 flex-1 animate-pulse rounded-md bg-muted" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </>
    );
}
