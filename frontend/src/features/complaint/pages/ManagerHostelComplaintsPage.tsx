import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowLeft, ChevronRight } from 'lucide-react';

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
import { ComplaintStatusBadge } from '../components/ComplaintStatusBadge';
import { ComplaintCategoryBadge } from '../components/ComplaintCategoryBadge';
import { useHostelComplaints } from '../hooks/complaint.hooks';
import { complaintDateLabel } from '../utils/complaint.utils';
import type { ComplaintStatus } from '../types/complaint.types';
import { useComplaintFilters } from '../hooks/useComplaintFilters';

// =============================================================================
// Page component
// =============================================================================

/**
 * Manager/Admin: all complaints for a specific hostel.
 *
 * No AppLayout — rendered inside <AppLayout> route wrapper in AppRoutes (§11).
 *
 * Features:
 *  - Status filter synced to URL search params.
 *  - Each row navigates to the full complaint detail page.
 *  - Net score shown for prioritization context.
 *
 * Route: {@code /manager/hostels/:hostelId/complaints}
 */
export default function ManagerHostelComplaintsPage() {
    const { hostelId } = useParams<{ hostelId: string }>();
    const navigate = useNavigate();

    const { filters, page, setFilters, setPage, apiParams } =
        useComplaintFilters(20);

    const {
        data: complaintPage,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useHostelComplaints(hostelId, {
        page: apiParams.page,
        size: apiParams.size,
        status: apiParams.status as ComplaintStatus | undefined,
    });

    const complaints = complaintPage?.content ?? [];
    const hasFilter = filters.status !== 'ALL';

    if (!hostelId) {
        return (
            <EmptyState
                icon={<AlertCircle className="h-8 w-8 text-gray-400" />}
                title="No hostel selected"
                description="Navigate to a hostel to view its complaints."
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/manager/hostels")}
                    >
                        Go back
                    </Button>
                }
            />
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
        >
            {/* ── Back + header ────────────────────────────────────────── */}
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
                    title="Hostel Complaints"
                    description="All complaints raised for this hostel."
                />
            </div>

            {/* ── Status filter ────────────────────────────────────────── */}
            <div className="flex items-center gap-2">
                <div className="w-48">
                    <Select
                        value={filters.status}
                        onValueChange={(val) =>
                            setFilters({
                                status: val as ComplaintStatus | 'ALL',
                            })
                        }
                    >
                        <SelectTrigger className="border-gray-200 bg-white text-gray-900 focus:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-600">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <SelectItem value="ALL">All statuses</SelectItem>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">
                                In Progress
                            </SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
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

            {/* ── Content ──────────────────────────────────────────────── */}
            {isError ? (
                <EmptyState
                    icon={<AlertCircle className="h-8 w-8 text-gray-400" />}
                    title="Could not load complaints"
                    description="There was a problem fetching complaint data."
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
                <ComplaintsTableSkeleton />
            ) : complaints.length === 0 ? (
                <EmptyState
                    icon={<AlertCircle className="h-8 w-8 text-gray-400" />}
                    title="No complaints found"
                    description={
                        hasFilter
                            ? 'No complaints match the selected filter.'
                            : 'No complaints have been raised for this hostel.'
                    }
                    action={
                        hasFilter ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setFilters({ status: 'ALL' })}
                            >
                                Clear filter
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div
                    className={`overflow-hidden rounded-xl border border-gray-200 bg-white transition-opacity duration-200 dark:border-gray-800 dark:bg-gray-950 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
                >
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50">
                                <Th>Complaint</Th>
                                <Th>Status</Th>
                                <Th>Score</Th>
                                <Th>Raised</Th>
                                <Th className="w-10" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            <AnimatePresence mode="popLayout">
                                {complaints.map((complaint) => (
                                    <motion.tr
                                        key={complaint.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.18 }}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40"
                                        onClick={() =>
                                            navigate(
                                                `/complaints/${complaint.id}`
                                            )
                                        }
                                    >
                                        {/* Title + category + author */}
                                        <td className="px-4 py-3">
                                            <p className="max-w-xs truncate font-medium text-gray-900 dark:text-gray-100">
                                                {complaint.title}
                                            </p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <ComplaintCategoryBadge
                                                    category={
                                                        complaint.category
                                                    }
                                                    iconOnly
                                                />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {complaint.authorName}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <ComplaintStatusBadge
                                                status={complaint.status}
                                            />
                                        </td>

                                        {/* Net score */}
                                        <td className="px-4 py-3 text-sm font-bold tabular-nums">
                                            <span
                                                className={
                                                    complaint.netScore > 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : complaint.netScore < 0
                                                          ? 'text-red-500 dark:text-red-400'
                                                          : 'text-gray-500 dark:text-gray-400'
                                                }
                                            >
                                                {complaint.netScore > 0
                                                    ? `+${complaint.netScore}`
                                                    : complaint.netScore}
                                            </span>
                                        </td>

                                        {/* Date */}
                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                                            {complaintDateLabel(
                                                complaint.createdAt
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
            )}

            {/* ── Pagination ──────────────────────────────────────────── */}
            {complaintPage && complaintPage.totalPages > 1 && (
                <Pagination
                    currentPage={page}
                    totalPages={complaintPage.totalPages}
                    totalElements={complaintPage.totalElements}
                    onPageChange={setPage}
                    isLoading={isFetching}
                />
            )}
        </motion.div>
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

function ComplaintsTableSkeleton() {
    return (
        <div
            className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
            aria-hidden="true"
        >
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                        <div className="flex-1 space-y-1.5">
                            <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        </div>
                        <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                        <div className="h-4 w-8 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                ))}
            </div>
        </div>
    );
}
