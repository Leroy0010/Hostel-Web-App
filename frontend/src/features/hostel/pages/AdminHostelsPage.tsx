import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Plus,
    Pencil,
    PowerOff,
    Power,
    Search,
    Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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

import { GenderPolicyBadge } from '../components/GenderPolicyBadge';
import { HostelStatusBadge } from '../components/HostelStatusBadge';
import { CreateHostelForm } from '../components/CreateHostelForm';
import { UpdateHostelForm } from '../components/UpdateHostelForm';
import { AssignManagerDialog } from '../components/AssignManagerDialog';
import {
    useAdminHostels,
    useActivateHostel,
    useDeactivateHostel,
} from '../hooks/hostel.hooks';
import { useHostelFilters } from '../hooks/useHostelFilters';
import { hostelImageFallback } from '../utils/hostel.utils';
import type { HostelDto, HostelSummaryDto } from '../types/hostel.types';
import { ContentSkeleton } from '../components/AdminHostelsSkeleton';
import { handleUploadImage } from '@/services/cloudinary.service';

// =============================================================================
// Types
// =============================================================================

type ActiveDialog =
    | { kind: 'create' }
    | { kind: 'edit'; hostel: HostelDto }
    | { kind: 'assign'; hostel: HostelDto }
    | { kind: 'deactivate'; hostel: HostelSummaryDto }
    | { kind: 'activate'; hostel: HostelSummaryDto };

// =============================================================================
// Page component
// =============================================================================

export default function AdminHostelsPage() {
    const navigate = useNavigate();

    const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
    const closeDialog = () => setActiveDialog(null);

    // ── Filter + pagination ───────────────────────────────────────────────────
    const { filters, page, setFilters, setPage, apiParams } =
        useHostelFilters(20);

    // ── Queries ───────────────────────────────────────────────────────────────
    const {
        data: hostelPage,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useAdminHostels(apiParams);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { mutate: deactivate, isPending: isDeactivating } =
        useDeactivateHostel();
    const { mutate: activate, isPending: isActivating } = useActivateHostel();

    const hostels = hostelPage?.content ?? [];

    // Helper to fetch full hostel for edit/manage actions
    const handleActionWithFullHostel = async (
        hostelId: string,
        actionKind: 'edit' | 'assign'
    ) => {
        const { data } = await import('../api/hostel.api').then((m) => ({
            data: m.fetchHostelById(hostelId),
        }));
        const full = await data;
        setActiveDialog({
            kind: actionKind,
            hostel: full.hostel,
        });
    };

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
                    title="Manage Hostels"
                    description="Create, edit, and manage all hostels including inactive ones."
                    actions={
                        <Button
                            onClick={() => setActiveDialog({ kind: 'create' })}
                            className="gap-2 bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            New Hostel
                        </Button>
                    }
                />

                {/* ── Search bar ──────────────────────────────────────── */}
                <div className="relative max-w-sm">
                    <Search
                        className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                        aria-hidden="true"
                    />
                    <Input
                        type="search"
                        placeholder="Search hostels…"
                        value={filters.search}
                        onChange={(e) =>
                            setFilters({ ...filters, search: e.target.value })
                        }
                        // Adjusted placeholder text colors for better contrast
                        className="border-gray-200 bg-white pl-9 text-gray-900 placeholder:text-gray-500 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-600"
                    />
                </div>

                {/* ── Content area ────────────────────────────────────── */}
                {isError ? (
                    <EmptyState
                        icon={<Building2 className="h-8 w-8 text-gray-400" />}
                        title="Could not load hostels"
                        description="There was a problem fetching hostel data. Please try again."
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
                    <ContentSkeleton />
                ) : hostels.length === 0 ? (
                    <EmptyState
                        icon={<Building2 className="h-8 w-8 text-gray-400" />}
                        title="No hostels found"
                        description={
                            filters.search
                                ? `No hostels match "${filters.search}". Try a different search.`
                                : 'No hostels have been created yet. Create your first one.'
                        }
                        action={
                            !filters.search ? (
                                <Button
                                    size="sm"
                                    onClick={() =>
                                        setActiveDialog({ kind: 'create' })
                                    }
                                    className="bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Create hostel
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div
                        className={`transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
                    >
                        {/* ── Mobile View: Card Layout ───────────────────────── */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            <AnimatePresence mode="popLayout">
                                {hostels.map((hostel) => (
                                    <motion.div
                                        key={hostel.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
                                    >
                                        <div className="flex gap-4 p-4">
                                            <img
                                                src={
                                                    hostel.imageUrl ||
                                                    hostelImageFallback()
                                                }
                                                alt=""
                                                className="h-16 w-16 shrink-0 rounded-lg object-cover"
                                                onError={(e) => {
                                                    (
                                                        e.currentTarget as HTMLImageElement
                                                    ).src =
                                                        hostelImageFallback();
                                                }}
                                                aria-hidden="true"
                                            />
                                            <div className="flex min-w-0 flex-1 flex-col">
                                                <button
                                                    onClick={() =>
                                                        navigate(
                                                            `/hostels/${hostel.id}`
                                                        )
                                                    }
                                                    className="truncate text-left text-base font-semibold text-gray-900 hover:underline dark:text-gray-100"
                                                >
                                                    {hostel.name}
                                                </button>
                                                <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                                                    {hostel.address}
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <GenderPolicyBadge
                                                        policy={
                                                            hostel.genderPolicy
                                                        }
                                                    />
                                                    <HostelStatusBadge
                                                        isActive={
                                                            hostel.isActive
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 p-3 px-4 dark:border-gray-800 dark:bg-gray-900/50">
                                            <button
                                                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                                                onClick={() =>
                                                    handleActionWithFullHostel(
                                                        hostel.id,
                                                        'assign'
                                                    )
                                                }
                                            >
                                                <Users className="h-4 w-4" />
                                                Manager
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <ActionIconButton
                                                    label={`Edit ${hostel.name}`}
                                                    onClick={() =>
                                                        handleActionWithFullHostel(
                                                            hostel.id,
                                                            'edit'
                                                        )
                                                    }
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </ActionIconButton>
                                                {hostel.isActive ? (
                                                    <ActionIconButton
                                                        label={`Deactivate ${hostel.name}`}
                                                        destructive
                                                        onClick={() =>
                                                            setActiveDialog({
                                                                kind: 'deactivate',
                                                                hostel,
                                                            })
                                                        }
                                                    >
                                                        <PowerOff className="h-4 w-4" />
                                                    </ActionIconButton>
                                                ) : (
                                                    <ActionIconButton
                                                        label={`Activate ${hostel.name}`}
                                                        onClick={() =>
                                                            setActiveDialog({
                                                                kind: 'activate',
                                                                hostel,
                                                            })
                                                        }
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </ActionIconButton>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* ── Desktop View: Table Layout ─────────────────────── */}
                        <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block dark:border-gray-800 dark:bg-gray-950">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 hover:bg-gray-50 dark:bg-gray-900/50 dark:hover:bg-gray-900/50">
                                        <Th>Hostel</Th>
                                        <Th>Gender</Th>
                                        <Th>Status</Th>
                                        <Th>Manager</Th>
                                        <Th className="text-right">Actions</Th>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    <AnimatePresence mode="popLayout">
                                        {hostels.map((hostel) => (
                                            <motion.tr
                                                key={hostel.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="group border-b transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50"
                                            >
                                                <TableCell className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={
                                                                hostel.imageUrl ||
                                                                hostelImageFallback()
                                                            }
                                                            alt=""
                                                            className="h-10 w-14 shrink-0 rounded-md object-cover"
                                                            onError={(e) => {
                                                                (
                                                                    e.currentTarget as HTMLImageElement
                                                                ).src =
                                                                    hostelImageFallback();
                                                            }}
                                                            aria-hidden="true"
                                                        />
                                                        <div className="min-w-0">
                                                            <button
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/hostels/${hostel.id}`
                                                                    )
                                                                }
                                                                className="truncate text-sm font-semibold text-gray-900 hover:underline dark:text-gray-100"
                                                            >
                                                                {hostel.name}
                                                            </button>
                                                            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                                                                {hostel.address}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="px-4 py-3">
                                                    <GenderPolicyBadge
                                                        policy={
                                                            hostel.genderPolicy
                                                        }
                                                    />
                                                </TableCell>

                                                <TableCell className="px-4 py-3">
                                                    <HostelStatusBadge
                                                        isActive={
                                                            hostel.isActive
                                                        }
                                                    />
                                                </TableCell>

                                                <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                    <button
                                                        className="text-xs text-gray-400 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-300"
                                                        onClick={() =>
                                                            handleActionWithFullHostel(
                                                                hostel.id,
                                                                'assign'
                                                            )
                                                        }
                                                    >
                                                        Manage
                                                    </button>
                                                </TableCell>

                                                <TableCell className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <ActionIconButton
                                                            label={`Edit ${hostel.name}`}
                                                            onClick={() =>
                                                                handleActionWithFullHostel(
                                                                    hostel.id,
                                                                    'edit'
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </ActionIconButton>

                                                        {hostel.isActive ? (
                                                            <ActionIconButton
                                                                label={`Deactivate ${hostel.name}`}
                                                                destructive
                                                                onClick={() =>
                                                                    setActiveDialog(
                                                                        {
                                                                            kind: 'deactivate',
                                                                            hostel,
                                                                        }
                                                                    )
                                                                }
                                                            >
                                                                <PowerOff className="h-4 w-4" />
                                                            </ActionIconButton>
                                                        ) : (
                                                            <ActionIconButton
                                                                label={`Activate ${hostel.name}`}
                                                                onClick={() =>
                                                                    setActiveDialog(
                                                                        {
                                                                            kind: 'activate',
                                                                            hostel,
                                                                        }
                                                                    )
                                                                }
                                                            >
                                                                <Power className="h-4 w-4" />
                                                            </ActionIconButton>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* ── Pagination ──────────────────────────────────────── */}
                {hostelPage && hostelPage.totalPages > 1 && (
                    <Pagination
                        currentPage={page}
                        totalPages={hostelPage.totalPages}
                        totalElements={hostelPage.totalElements}
                        onPageChange={setPage}
                        isLoading={isFetching}
                    />
                )}
            </motion.div>

            {/* ================================================================
                Dialogs — driven by the `activeDialog` discriminated union.
            ================================================================ */}
            <Dialog
                open={activeDialog?.kind === 'create'}
                onOpenChange={(open) => !open && closeDialog()}
            >
                <DialogContent className="max-h-[90vh] w-screen max-w-2xl scrollbar-none overflow-y-auto border-gray-200 bg-white sm:max-w-lg dark:border-gray-800 dark:bg-gray-950">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-gray-100">
                            Create Hostel
                        </DialogTitle>
                    </DialogHeader>
                    <CreateHostelForm
                        onSuccess={(id) => {
                            closeDialog();
                            navigate(`/hostels/${id}`);
                        }}
                        onCancel={closeDialog}
                        onUploadImage={(file) =>
                            handleUploadImage(file, 'hostels')
                        }
                    />
                </DialogContent>
            </Dialog>

            {activeDialog?.kind === 'edit' && (
                <Dialog open onOpenChange={(open) => !open && closeDialog()}>
                    <DialogContent className="max-h-[90vh] w-screen max-w-2xl scrollbar-none overflow-y-auto border-gray-200 bg-white sm:max-w-lg dark:border-gray-800 dark:bg-gray-950">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-gray-100">
                                Edit Hostel
                            </DialogTitle>
                        </DialogHeader>
                        <UpdateHostelForm
                            hostel={activeDialog.hostel}
                            onSuccess={closeDialog}
                            onCancel={closeDialog}
                            onUploadImage={(file) =>
                                handleUploadImage(file, 'hostels')
                            }
                        />
                    </DialogContent>
                </Dialog>
            )}

            {activeDialog?.kind === 'assign' && (
                <AssignManagerDialog
                    open
                    onOpenChange={(open) => !open && closeDialog()}
                    hostel={activeDialog.hostel}
                    onSuccess={closeDialog}
                />
            )}

            {activeDialog?.kind === 'deactivate' && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && closeDialog()}
                    title={`Deactivate "${activeDialog.hostel.name}"?`}
                    description="The hostel will be hidden from students. This can be reversed at any time."
                    confirmLabel="Deactivate"
                    variant="destructive"
                    isPending={isDeactivating}
                    onConfirm={() =>
                        deactivate(activeDialog.hostel.id, {
                            onSuccess: closeDialog,
                        })
                    }
                />
            )}

            {activeDialog?.kind === 'activate' && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && closeDialog()}
                    title={`Activate "${activeDialog.hostel.name}"?`}
                    description="The hostel will become visible to students and available for booking."
                    confirmLabel="Activate"
                    isPending={isActivating}
                    onConfirm={() =>
                        activate(activeDialog.hostel.id, {
                            onSuccess: closeDialog,
                        })
                    }
                />
            )}
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
        <TableHead
            className={`px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400 ${className}`}
        >
            {children}
        </TableHead>
    );
}

function ActionIconButton({
    children,
    label,
    destructive = false,
    onClick,
}: {
    children: React.ReactNode;
    label: string;
    destructive?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className={`rounded-md p-1.5 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none ${
                destructive
                    ? 'text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-600 dark:hover:bg-red-950/30 dark:hover:text-red-400'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300'
            }`}
        >
            {children}
        </button>
    );
}
