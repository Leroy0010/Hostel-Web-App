import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/CustomPagination';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { AuditActionBadge } from '../components/AuditActionBadge';
import { AuditLogDetailDialog } from '../components/AuditLogDetailDialog';
import { useAuditLogs } from '../hooks/audit.hooks';
import type { AuditLogDto } from '../types/audit.types';
import { transition } from '@/features/auth/utils/transition';

const pageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition },
};

/**
 * Admin-only audit trail viewer.
 *
 * Shows every privileged (ADMIN/MANAGER) action recorded by the backend's
 * {@code @Audited} aspect — staff creation, user activation/deactivation,
 * hostel manager (re)assignment, room create/update/status/delete, etc.
 * Clicking a row opens the before/after JSON snapshot when one was captured.
 *
 * Route: {@code /admin/audit-logs} — protected, ADMIN only.
 */
export default function AuditLogPage() {
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<AuditLogDto | null>(null);

    const { data, isLoading, isFetching } = useAuditLogs({
        page,
        size: 20,
        sort: 'createdAt,desc',
    });

    const logs = data?.content ?? [];

    return (
        <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 p-4 sm:p-6"
        >
            <PageHeader
                title="Audit Log"
                description="A record of every administrative action taken on the platform."
            />

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-12 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800/60"
                        />
                    ))}
                </div>
            ) : logs.length === 0 ? (
                <EmptyState
                    icon={<ScrollText className="h-8 w-8" />}
                    title="No audit entries yet"
                    description="Administrative actions (staff creation, deactivations, hostel manager assignments, room changes, etc.) will show up here as they happen."
                />
            ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Action</TableHead>
                                <TableHead>Detail</TableHead>
                                <TableHead>Actor</TableHead>
                                <TableHead>When</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow
                                    key={log.id}
                                    className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/40"
                                    onClick={() => setSelected(log)}
                                >
                                    <TableCell>
                                        <AuditActionBadge action={log.action} />
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                        {log.detail ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {log.actorRole}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(
                                            log.createdAt
                                        ).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {data && data.totalPages > 1 && (
                <Pagination
                    currentPage={page}
                    totalPages={data.totalPages}
                    totalElements={data.totalElements}
                    onPageChange={setPage}
                    isLoading={isFetching}
                />
            )}

            <AuditLogDetailDialog
                log={selected}
                onClose={() => setSelected(null)}
            />
        </motion.div>
    );
}
