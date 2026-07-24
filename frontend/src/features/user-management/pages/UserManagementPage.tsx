import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail,
    Phone,
    Plus,
    Power,
    PowerOff,
    Search,
    Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { UserRoleBadge } from '../components/UserRoleBadge';
import { UserStatusBadge } from '../components/UserStatusBadge';
import { CreateStaffDialog } from '../components/CreateStaffDialog';
import {
    useActivateUser,
    useDeactivateUser,
    useUsers,
} from '../hooks/user-management.hooks';
import type { UserDto, UserRole } from '../types/user-management.types';
import { transition } from '@/features/auth/utils/transition';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

// =============================================================================
// Types
// =============================================================================

/** Tracks which dialog is open. Only one at a time. */
type ActiveDialog =
    | { kind: 'create' }
    | { kind: 'deactivate'; user: UserDto }
    | { kind: 'activate'; user: UserDto };

// =============================================================================
// Animation
// =============================================================================

const pageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition },
};

// =============================================================================
// Page
// =============================================================================

/**
 * Admin user management page.
 *
 * Features:
 *  - Paginated table of all users (ADMIN, MANAGER, STUDENT).
 *  - Filters: role, active/inactive status, full-text search (name/email).
 *  - Create staff account dialog (MANAGER or ADMIN only).
 *  - Activate / deactivate with confirmation dialog.
 *  - Full loading, error, and empty states.
 *
 * Route: {@code /admin/users} — protected, ADMIN only.
 */
export default function UserManagementPage() {
    const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
    const closeDialog = () => setActiveDialog(null);

    const { user: authUser } = useAuthStore((state) => state);

    // ── Filter state ──────────────────────────────────────────────────────────
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');

    const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
    const [statusFilter, setStatusFilter] = useState<
        'ALL' | 'ACTIVE' | 'INACTIVE'
    >('ALL');

    const debouncedSearch = useDebounce(search, 400);

    const apiParams = {
        page,
        size: 20,
        search: debouncedSearch || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        isActive:
            statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
    };

    // ── Queries ───────────────────────────────────────────────────────────────
    const {
        data: userPage,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useUsers(apiParams);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { mutate: deactivate, isPending: isDeactivating } =
        useDeactivateUser();
    const { mutate: activate, isPending: isActivating } = useActivateUser();

    const users = userPage?.content ?? [];
    const hasActiveFilters =
        debouncedSearch !== '' ||
        roleFilter !== 'ALL' ||
        statusFilter !== 'ALL';

    const clearFilters = () => {
        setPage(0);
        setSearch('');
        setRoleFilter('ALL');
        setStatusFilter('ALL');
    };

    return (
        <>
            <motion.div
                variants={pageVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
            >
                {/* ── Page header ─────────────────────────────────────── */}
                <PageHeader
                    title="User Management"
                    description="Manage admin, manager, and student accounts across the platform."
                    actions={
                        <Button
                            onClick={() => setActiveDialog({ kind: 'create' })}
                            className="gap-2 bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            New Staff Account
                        </Button>
                    }
                />

                {/* ── Filters ─────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative max-w-xs flex-1">
                        <Search
                            className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                            aria-hidden="true"
                        />
                        <Input
                            type="search"
                            placeholder="Search name or email…"
                            value={search}
                            onChange={(e) => {
                                setPage(0);
                                setSearch(e.target.value);
                            }}
                            className="border-gray-200 bg-white pl-9 text-gray-900 placeholder:text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                        />
                    </div>

                    {/* Role filter */}
                    <Select
                        value={roleFilter}
                        onValueChange={(val) => {
                            setPage(0);
                            setRoleFilter(val as UserRole | 'ALL');
                        }}
                    >
                        <SelectTrigger className="w-36 border-gray-200 bg-white text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                            <SelectValue placeholder="Any role" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <SelectItem value="ALL">Any role</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="MANAGER">Manager</SelectItem>
                            <SelectItem value="STUDENT">Student</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Status filter */}
                    <Select
                        value={statusFilter}
                        onValueChange={(val) => {
                            setPage(0);
                            setStatusFilter(val as typeof statusFilter);
                        }}
                    >
                        <SelectTrigger className="w-36 border-gray-200 bg-white text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                            <SelectValue placeholder="Any status" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <SelectItem value="ALL">Any status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        >
                            Clear
                        </Button>
                    )}

                    {userPage && (
                        <span className="ml-auto text-sm text-gray-400 dark:text-gray-500">
                            {userPage.totalElements} user
                            {userPage.totalElements !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {/* ── Content ─────────────────────────────────────────── */}
                {isError ? (
                    <EmptyState
                        icon={<Users className="h-8 w-8 text-gray-400" />}
                        title="Could not load users"
                        description="There was a problem fetching user data. Please try again."
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
                    <TableSkeleton />
                ) : users.length === 0 ? (
                    <EmptyState
                        icon={<Users className="h-8 w-8 text-gray-400" />}
                        title="No users found"
                        description={
                            hasActiveFilters
                                ? 'No users match the current filters.'
                                : 'No user accounts exist yet.'
                        }
                        action={
                            hasActiveFilters ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                >
                                    Clear filters
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div
                        className={`overflow-hidden rounded-xl border border-gray-200 bg-white transition-opacity duration-200 dark:border-gray-800 dark:bg-gray-950 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
                    >
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50 dark:bg-gray-900/50 dark:hover:bg-gray-900/50">
                                    <Th>User</Th>
                                    <Th>Role</Th>
                                    <Th>Status</Th>
                                    <Th className="text-right">Actions</Th>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                                <AnimatePresence mode="popLayout">
                                    {users.map((user) => (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/40"
                                        >
                                            {/* User info */}
                                            <TableCell className="px-4 py-3">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {user.name}
                                                </p>
                                                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400 dark:text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Mail
                                                            className="h-3 w-3"
                                                            aria-hidden="true"
                                                        />
                                                        {user.email}
                                                    </span>
                                                    {user.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone
                                                                className="h-3 w-3"
                                                                aria-hidden="true"
                                                            />
                                                            {user.phone}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Role */}
                                            <TableCell className="px-4 py-3">
                                                <UserRoleBadge
                                                    role={user.role}
                                                />
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell className="px-4 py-3">
                                                <UserStatusBadge
                                                    isActive={user.isActive}
                                                />
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="px-4 py-3 text-right">
                                                {user.isActive ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setActiveDialog({
                                                                kind: 'deactivate',
                                                                user,
                                                            })
                                                        }
                                                        className="h-7 gap-1.5 px-2 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                                        aria-label={`Deactivate ${user.name}`}
                                                        disabled={
                                                            authUser?.id ===
                                                            user.id
                                                        }
                                                    >
                                                        <PowerOff
                                                            className="h-3.5 w-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        Deactivate
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setActiveDialog({
                                                                kind: 'activate',
                                                                user,
                                                            })
                                                        }
                                                        className="h-7 gap-1.5 px-2 text-xs text-gray-400 hover:bg-green-50 hover:text-green-600 dark:text-gray-600 dark:hover:bg-green-950/30 dark:hover:text-green-400"
                                                        aria-label={`Activate ${user.name}`}
                                                    >
                                                        <Power
                                                            className="h-3.5 w-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        Activate
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* ── Pagination ──────────────────────────────────────── */}
                {userPage && userPage.totalPages > 1 && (
                    <Pagination
                        currentPage={page}
                        totalPages={userPage.totalPages}
                        totalElements={userPage.totalElements}
                        onPageChange={setPage}
                        isLoading={isFetching}
                    />
                )}
            </motion.div>

            {/* ================================================================
                Dialogs
            ================================================================ */}

            {/* Create staff */}
            <CreateStaffDialog
                open={activeDialog?.kind === 'create'}
                onOpenChange={(open) => !open && closeDialog()}
            />

            {/* Deactivate confirmation */}
            {activeDialog?.kind === 'deactivate' && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && closeDialog()}
                    title={`Deactivate ${activeDialog.user.name}?`}
                    description="This account will no longer be able to log in. Their data is preserved and this can be reversed at any time."
                    confirmLabel="Deactivate"
                    variant="destructive"
                    isPending={isDeactivating}
                    onConfirm={() => {
                        deactivate(activeDialog.user.id, {
                            onSuccess: closeDialog,
                        });
                    }}
                />
            )}

            {/* Activate confirmation */}
            {activeDialog?.kind === 'activate' && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && closeDialog()}
                    title={`Activate ${activeDialog.user.name}?`}
                    description="This account will be able to log in again."
                    confirmLabel="Activate"
                    isPending={isActivating}
                    onConfirm={() => {
                        activate(activeDialog.user.id, {
                            onSuccess: closeDialog,
                        });
                    }}
                />
            )}
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

/** Animated table loading skeleton. */
function TableSkeleton() {
    return (
        <div
            className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
            aria-label="Loading users"
            aria-hidden="true"
        >
            <Table>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-transparent">
                            <TableCell colSpan={4} className="px-4 py-3.5">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3.5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                        <div className="h-3 w-56 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                                    </div>
                                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                                    <div className="h-7 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
