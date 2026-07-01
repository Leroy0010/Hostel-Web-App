import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CalendarDays,
    Clock,
    ListOrdered,
    Mail,
    Trash2,
    Users,
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/CustomPagination';
import { WaitlistPositionBadge } from './WaitlistPositionBadge';
import {
    useManagerWaitlist,
    useManagerRemoveWaitlistEntry,
} from '../hooks/waitlist.hooks';
import {
    academicYearOptions,
    joinedAtLabel,
    roomTypeLabel,
    semesterLabel,
} from '../utils/waitlist.utils';
import type {
    ManagerWaitlistParams,
    WaitlistEntryDto,
} from '../types/waitlist.types';
import type { RoomType } from '@/features/room/types/room.types';
import type { Semester } from '@/features/booking/types/booking.types';

// =============================================================================
// Props
// =============================================================================

interface ManagerWaitlistTableProps {
    /** UUID of the hostel whose waitlist to display. */
    hostelId: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Manager-facing waitlist queue table for a single hostel.
 *
 * Features:
 *  - Filter by room type, academic year, and semester.
 *  - Paginated table of queue entries sorted by room type then position.
 *  - Force-remove individual entries with a confirmation dialog.
 *  - Notified entries highlighted with an amber indicator.
 *
 * Designed to be embedded inside the manager hostel rooms page or as a
 * dedicated waitlist management page.
 *
 * Maps to: {@code GET /api/manager/hostels/{hostelId}/waitlist}
 *
 * @example
 * ```tsx
 * <ManagerWaitlistTable hostelId={hostelId} />
 * ```
 */
export function ManagerWaitlistTable({ hostelId }: ManagerWaitlistTableProps) {
    const yearOptions = academicYearOptions();

    // ── Local filter state ────────────────────────────────────────────────────
    const [page, setPage] = useState(0);
    const [filters, setFilters] = useState<ManagerWaitlistParams>({
        roomType: undefined,
        academicYear: yearOptions[1],
        semester: undefined,
        size: 20,
    });

    // Entry targeted by the remove confirmation dialog; null = dialog closed.
    const [pendingRemove, setPendingRemove] = useState<WaitlistEntryDto | null>(
        null
    );

    // ── Data ──────────────────────────────────────────────────────────────────
    const {
        data: queuePage,
        isLoading,
        isError,
        isFetching,
    } = useManagerWaitlist(hostelId, { ...filters, page });

    const { mutate: removeEntry, isPending: isRemoving } =
        useManagerRemoveWaitlistEntry();

    const entries = queuePage?.content ?? [];

    /** Resets page to 0 whenever any filter changes. */
    const handleFilterChange = (patch: Partial<ManagerWaitlistParams>) => {
        setPage(0);
        setFilters((prev) => ({ ...prev, ...patch }));
    };

    const handleConfirmRemove = () => {
        if (!pendingRemove) return;
        removeEntry(pendingRemove.id, {
            onSuccess: () => setPendingRemove(null),
        });
    };

    return (
        <>
            <div className="space-y-4">
                {/* ── Filter bar ────────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Room type filter */}
                    <Select
                        value={filters.roomType ?? 'ALL'}
                        onValueChange={(val) =>
                            handleFilterChange({
                                roomType:
                                    val === 'ALL'
                                        ? undefined
                                        : (val as RoomType),
                            })
                        }
                    >
                        <SelectTrigger className="w-36 border-gray-200 bg-white text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                            <SelectValue placeholder="Any type" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <SelectItem value="ALL">Any type</SelectItem>
                            <SelectItem value="SINGLE">Single</SelectItem>
                            <SelectItem value="DOUBLE">Double</SelectItem>
                            <SelectItem value="TRIPLE">Triple</SelectItem>
                            <SelectItem value="QUAD">Quad</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Academic year filter */}
                    <Select
                        value={filters.academicYear ?? ''}
                        onValueChange={(val) =>
                            handleFilterChange({
                                academicYear: val || undefined,
                            })
                        }
                    >
                        <SelectTrigger className="w-36 border-gray-200 bg-white text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                            <SelectValue placeholder="Any year" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <SelectItem value="any">Any year</SelectItem>
                            {yearOptions.map((y) => (
                                <SelectItem key={y} value={y}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Semester filter */}
                    <Select
                        value={filters.semester ?? 'ALL'}
                        onValueChange={(val) =>
                            handleFilterChange({
                                semester:
                                    val === 'ALL'
                                        ? undefined
                                        : (val as Semester),
                            })
                        }
                    >
                        <SelectTrigger className="w-40 border-gray-200 bg-white text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                            <SelectValue placeholder="Any semester" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <SelectItem value="ALL">Any semester</SelectItem>
                            <SelectItem value="FIRST">
                                First Semester
                            </SelectItem>
                            <SelectItem value="SECOND">
                                Second Semester
                            </SelectItem>
                            <SelectItem value="FULL">Full Year</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Total count */}
                    {queuePage && (
                        <span className="ml-auto text-sm text-gray-400 dark:text-gray-500">
                            {queuePage.totalElements}{' '}
                            {queuePage.totalElements === 1
                                ? 'entry'
                                : 'entries'}
                        </span>
                    )}
                </div>

                {/* ── Table ─────────────────────────────────────────────────── */}
                {isError ? (
                    <EmptyState
                        icon={<ListOrdered className="h-8 w-8 text-gray-400" />}
                        title="Could not load waitlist"
                        description="There was a problem fetching the waitlist data. Please try again."
                    />
                ) : isLoading ? (
                    <WaitlistTableSkeleton />
                ) : entries.length === 0 ? (
                    <EmptyState
                        icon={<Users className="h-8 w-8 text-gray-400" />}
                        title="No waitlist entries"
                        description={
                            filters.roomType || filters.semester
                                ? 'No entries match the current filters.'
                                : 'No students are currently waiting for a room in this hostel.'
                        }
                    />
                ) : (
                    <div
                        className={`overflow-hidden rounded-xl border border-gray-200 bg-white transition-opacity duration-200 dark:border-gray-800 dark:bg-gray-950 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
                    >
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50 dark:bg-gray-900/50 dark:hover:bg-gray-900/50">
                                    <Th>#</Th>
                                    <Th>Student</Th>
                                    <Th>Room Type</Th>
                                    <Th>Period</Th>
                                    <Th>Joined</Th>
                                    <Th>Status</Th>
                                    <Th className="text-right">Action</Th>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                                <AnimatePresence mode="popLayout">
                                    {entries.map((entry) => (
                                        <motion.tr
                                            key={entry.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/40 ${entry.notified ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}
                                        >
                                            {/* Position */}
                                            <TableCell className="px-4 py-3">
                                                <WaitlistPositionBadge
                                                    position={entry.position}
                                                    compact
                                                />
                                            </TableCell>

                                            {/* Student info */}
                                            <TableCell className="px-4 py-3">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {entry.studentFirstName}{' '}
                                                    {entry.studentLastName}
                                                </p>
                                                <a
                                                    href={`mailto:${entry.studentEmail}`}
                                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                                                >
                                                    <Mail
                                                        className="h-3 w-3"
                                                        aria-hidden="true"
                                                    />
                                                    {entry.studentEmail}
                                                </a>
                                            </TableCell>

                                            {/* Room type */}
                                            <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {roomTypeLabel(entry.roomType)}
                                            </TableCell>

                                            {/* Academic period */}
                                            <TableCell className="px-4 py-3">
                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                    {entry.academicYear}
                                                </p>
                                                <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                                    <CalendarDays
                                                        className="h-3 w-3"
                                                        aria-hidden="true"
                                                    />
                                                    {semesterLabel(
                                                        entry.semester
                                                    )}
                                                </p>
                                            </TableCell>

                                            {/* Join date */}
                                            <TableCell className="px-4 py-3">
                                                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                    <Clock
                                                        className="h-3 w-3 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    {joinedAtLabel(
                                                        entry.joinedAt
                                                    )}
                                                </span>
                                            </TableCell>

                                            {/* Notification status */}
                                            <TableCell className="px-4 py-3">
                                                {entry.notified ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                        Notified
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        Waiting
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Remove action */}
                                            <TableCell className="px-4 py-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        setPendingRemove(entry)
                                                    }
                                                    aria-label={`Remove ${entry.studentFirstName} ${entry.studentLastName} from waitlist`}
                                                    className="h-7 w-7 p-0 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                                >
                                                    <Trash2
                                                        className="h-3.5 w-3.5"
                                                        aria-hidden="true"
                                                    />
                                                </Button>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* ── Pagination ────────────────────────────────────────────── */}
                {queuePage && queuePage.totalPages > 1 && (
                    <Pagination
                        currentPage={page}
                        totalPages={queuePage.totalPages}
                        totalElements={queuePage.totalElements}
                        onPageChange={setPage}
                        isLoading={isFetching}
                    />
                )}
            </div>

            {/* ── Force-remove confirmation dialog ──────────────────────────── */}
            <ConfirmDialog
                open={Boolean(pendingRemove)}
                onOpenChange={(open) => !open && setPendingRemove(null)}
                title="Remove from waitlist?"
                description={
                    pendingRemove
                        ? `This will permanently remove ${pendingRemove.studentFirstName} ${pendingRemove.studentLastName} from position #${pendingRemove.position} in the ${roomTypeLabel(pendingRemove.roomType)} queue. Students behind them will move up automatically.`
                        : ''
                }
                confirmLabel="Remove"
                variant="destructive"
                isPending={isRemoving}
                onConfirm={handleConfirmRemove}
            />
        </>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================

/** Styled table header cell. */
function Th({
    children,
    className = '',
}: {
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <TableHead
            className={`px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400 ${className}`}
        >
            {children}
        </TableHead>
    );
}

/** Skeleton table matching the waitlist table layout. */
function WaitlistTableSkeleton() {
    return (
        <div
            className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
            aria-hidden="true"
        >
            <Table>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-transparent">
                            <TableCell colSpan={7} className="px-4 py-3.5">
                                <div className="flex items-center gap-4">
                                    <div className="h-5 w-8 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3.5 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                        <div className="h-3 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                                    </div>
                                    <div className="h-3.5 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                                    <div className="h-3.5 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                                    <div className="h-3.5 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
