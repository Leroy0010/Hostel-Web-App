import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Pencil, Plus, Trash2, Search } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

import { LandmarkCategoryFilter } from '../components/LandmarkCategoryFilter';
import { CreateLandmarkForm } from '../components/CreateLandmarkForm';
import { useAllLandmarks, useDeleteLandmark } from '../hooks/map.hooks';
import { categoryEmoji, categoryLabel } from '../utils/map.utils';
import type { LandmarkCategory, LandmarkDto } from '../types/map.types';
import { useDebounce } from '@/hooks/useDebounce';

// =============================================================================
// Types
// =============================================================================

type ActiveDialog =
    | { kind: 'create' }
    | { kind: 'edit'; landmark: LandmarkDto }
    | { kind: 'delete'; landmark: LandmarkDto };

// =============================================================================
// Page component
// =============================================================================

/**
 * Admin landmark management page.
 *
 * No AppLayout — rendered inside <AppLayout> wrapper in AppRoutes (§11).
 *
 * Features:
 * - Filterable & searchable list of all campus landmarks.
 * - Create landmark dialog.
 * - Edit landmark dialog (reuses CreateLandmarkForm with pre-populated values).
 * - Delete with confirmation dialog.
 * - Responsive: Uses Cards on mobile and Table on desktop.
 *
 * Route: {@code /admin/landmarks} — ADMIN only.
 */
export default function AdminLandmarksPage() {
    // ── Local State ──────────────────────────────────────────────────────────
    const [activeCategory, setActiveCategory] = useState<
        LandmarkCategory | undefined
    >(undefined);
    const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
    const [localSearch, setLocalSearch] = useState('');

    const debouncedSearch = useDebounce(localSearch, 400);

    const closeDialog = () => setActiveDialog(null);

    // ── Queries & Mutations ──────────────────────────────────────────────────
    const {
        data: landmarks = [],
        isLoading,
        isError,
        refetch,
    } = useAllLandmarks(activeCategory, debouncedSearch);

    const { mutate: deleteLandmark, isPending: isDeleting } =
        useDeleteLandmark();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
        >
            <PageHeader
                title="Campus Landmarks"
                description="Manage points of interest displayed on the campus map."
                actions={
                    <Button
                        onClick={() => setActiveDialog({ kind: 'create' })}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Add landmark
                    </Button>
                }
            />

            {/* Toolbar: Search & Category Filter */}
            <div className="flex flex-col gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                    <Input
                        type="search"
                        placeholder="Search landmarks..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="w-full pl-9"
                    />
                </div>
                <LandmarkCategoryFilter
                    selected={activeCategory}
                    onChange={(cat) => setActiveCategory(cat)}
                />
            </div>

            {/* Content Area */}
            {isError ? (
                <EmptyState
                    icon={<MapPin className="h-8 w-8 text-gray-400" />}
                    title="Could not load landmarks"
                    description="There was a problem fetching landmark data."
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
                <LandmarkTableSkeleton />
            ) : landmarks.length === 0 ? (
                <EmptyState
                    icon={<MapPin className="h-8 w-8 text-gray-400" />}
                    title="No landmarks found"
                    description={
                        debouncedSearch
                            ? `No landmarks match your search for "${debouncedSearch}".`
                            : activeCategory
                              ? `No ${categoryLabel(activeCategory)} landmarks exist yet.`
                              : 'No landmarks have been added. Create the first one.'
                    }
                    action={
                        !debouncedSearch && !activeCategory ? (
                            <Button
                                size="sm"
                                onClick={() =>
                                    setActiveDialog({ kind: 'create' })
                                }
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                Add landmark
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="space-y-4">
                    {/* ── Mobile Card View (Hidden on Desktop) ── */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        <AnimatePresence mode="popLayout">
                            {landmarks.map((landmark: LandmarkDto) => (
                                <motion.div
                                    key={landmark.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                {landmark.name}
                                            </p>
                                            {landmark.description && (
                                                <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                                                    {landmark.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <ActionBtn
                                                label={`Edit ${landmark.name}`}
                                                onClick={() =>
                                                    setActiveDialog({
                                                        kind: 'edit',
                                                        landmark,
                                                    })
                                                }
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </ActionBtn>
                                            <ActionBtn
                                                label={`Delete ${landmark.name}`}
                                                destructive
                                                onClick={() =>
                                                    setActiveDialog({
                                                        kind: 'delete',
                                                        landmark,
                                                    })
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </ActionBtn>
                                        </div>
                                    </div>

                                    <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-800/60">
                                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            <span aria-hidden="true">
                                                {categoryEmoji(
                                                    landmark.category
                                                )}
                                            </span>
                                            {categoryLabel(landmark.category)}
                                        </span>
                                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                            {landmark.latitude?.toFixed(4)},{' '}
                                            {landmark.longitude?.toFixed(4)}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* ── Desktop Table View (Hidden on Mobile) ── */}
                    <div className="hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-950">
                        <Table>
                            <TableHeader className="bg-gray-50/50 dark:bg-gray-900/20">
                                <TableRow>
                                    <TableHead className="w-[40%]">
                                        Landmark
                                    </TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Coordinates</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence mode="popLayout">
                                    {landmarks.map((landmark: LandmarkDto) => (
                                        <TableRow
                                            key={landmark.id}
                                            className="group"
                                        >
                                            {/* Name + Description */}
                                            <TableCell>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                                    {landmark.name}
                                                </p>
                                                {landmark.description && (
                                                    <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                                                        {landmark.description}
                                                    </p>
                                                )}
                                            </TableCell>

                                            {/* Category */}
                                            <TableCell>
                                                <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                                                    <span aria-hidden="true">
                                                        {categoryEmoji(
                                                            landmark.category
                                                        )}
                                                    </span>
                                                    {categoryLabel(
                                                        landmark.category
                                                    )}
                                                </span>
                                            </TableCell>

                                            {/* Coordinates */}
                                            <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                                {landmark.latitude?.toFixed(5)},{' '}
                                                {landmark.longitude?.toFixed(5)}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                                    <ActionBtn
                                                        label={`Edit ${landmark.name}`}
                                                        onClick={() =>
                                                            setActiveDialog({
                                                                kind: 'edit',
                                                                landmark,
                                                            })
                                                        }
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </ActionBtn>
                                                    <ActionBtn
                                                        label={`Delete ${landmark.name}`}
                                                        destructive
                                                        onClick={() =>
                                                            setActiveDialog({
                                                                kind: 'delete',
                                                                landmark,
                                                            })
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </ActionBtn>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* ── Create Dialog ─────────────────────────────────────────── */}
            <Dialog
                open={activeDialog?.kind === 'create'}
                onOpenChange={(open) => !open && closeDialog()}
            >
                <DialogContent className="w-full border-gray-200 bg-white sm:max-w-lg dark:border-gray-800 dark:bg-gray-950">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-gray-100">
                            Add Landmark
                        </DialogTitle>
                    </DialogHeader>
                    <CreateLandmarkForm
                        onSuccess={closeDialog}
                        onCancel={closeDialog}
                    />
                </DialogContent>
            </Dialog>

            {/* ── Edit Dialog ───────────────────────────────────────────── */}
            {activeDialog?.kind === 'edit' && (
                <Dialog open onOpenChange={(open) => !open && closeDialog()}>
                    <DialogContent className="w-full border-gray-200 bg-white sm:max-w-lg dark:border-gray-800 dark:bg-gray-950">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-gray-100">
                                Edit Landmark
                            </DialogTitle>
                        </DialogHeader>
                        <CreateLandmarkForm
                            prefillLatLng={{
                                lat: activeDialog.landmark.latitude,
                                lng: activeDialog.landmark.longitude,
                            }}
                            onSuccess={closeDialog}
                            onCancel={closeDialog}
                            initialValues={activeDialog.landmark}
                            isEditing={true}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* ── Delete Confirmation ───────────────────────────────────── */}
            {activeDialog?.kind === 'delete' && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && closeDialog()}
                    title={`Delete "${activeDialog.landmark.name}"?`}
                    description="This landmark will be permanently removed from the campus map."
                    confirmLabel="Delete"
                    variant="destructive"
                    isPending={isDeleting}
                    onConfirm={() => {
                        deleteLandmark(activeDialog.landmark.id, {
                            onSuccess: closeDialog,
                        });
                    }}
                />
            )}
        </motion.div>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================

function ActionBtn({
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
            className={`rounded-md p-2 transition-colors focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none sm:p-1.5 ${
                destructive
                    ? 'text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950/30 dark:hover:text-red-400'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300'
            }`}
        >
            {children}
        </button>
    );
}

function LandmarkTableSkeleton() {
    return (
        <div className="space-y-4">
            {/* Mobile Skeleton View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={`mob-skel-${i}`}
                        className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
                    >
                        <div className="flex justify-between gap-4">
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700/50" />
                                <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800/50" />
                            </div>
                            <div className="flex gap-2">
                                <div className="h-8 w-8 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800/50" />
                                <div className="h-8 w-8 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800/50" />
                            </div>
                        </div>
                        <div className="flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800/60">
                            <div className="h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800/50" />
                            <div className="h-4 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800/50" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Skeleton View */}
            <div className="hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-950">
                <Table>
                    <TableHeader className="bg-gray-50/50 dark:bg-gray-900/20">
                        <TableRow>
                            <TableHead className="w-[40%]">Landmark</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Coordinates</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={`desk-skel-${i}`}>
                                <TableCell>
                                    <div className="space-y-2">
                                        <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700/50" />
                                        <div className="h-3 w-64 animate-pulse rounded bg-gray-100 dark:bg-gray-800/50" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800/50" />
                                </TableCell>
                                <TableCell>
                                    <div className="h-3 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800/50" />
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        <div className="h-8 w-8 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800/50" />
                                        <div className="h-8 w-8 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800/50" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
