import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { AuditActionBadge } from './AuditActionBadge';
import type { AuditLogDto } from '../types/audit.types';

interface AuditLogDetailDialogProps {
    log: AuditLogDto | null;
    onClose: () => void;
}

/**
 * Shows the full detail of a single audit log entry, including a
 * side-by-side before/after JSON snapshot when available.
 *
 * Both {@code oldData} and {@code newData} are stored as raw JSON strings on
 * the backend — pretty-printed here for readability. Either may be absent
 * (e.g. creation has no "before", deletion has no "after").
 */
export function AuditLogDetailDialog({
    log,
    onClose,
}: AuditLogDetailDialogProps) {
    return (
        <Dialog open={log !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="scrollbar-none sm:max-w-3xl">
                {log && (
                    <>
                        <DialogHeader>
                            <div className="flex items-center gap-2">
                                <DialogTitle>Audit Entry</DialogTitle>
                                <AuditActionBadge action={log.action} />
                            </div>
                            <DialogDescription>
                                {log.detail ??
                                    `${log.action} on ${log.targetType ?? 'system'}`}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <p>
                                <span className="font-medium text-foreground">
                                    Actor:
                                </span>{' '}
                                {log.actorId} ({log.actorRole})
                            </p>
                            <p>
                                <span className="font-medium text-foreground">
                                    When:
                                </span>{' '}
                                {new Date(log.createdAt).toLocaleString()}
                            </p>
                            {log.targetType && (
                                <p>
                                    <span className="font-medium text-foreground">
                                        Target:
                                    </span>{' '}
                                    {log.targetType}
                                    {log.targetId ? ` (${log.targetId})` : ''}
                                </p>
                            )}
                        </div>

                        {(log.oldData || log.newData) && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <SnapshotBlock
                                    label="Before"
                                    json={log.oldData}
                                />
                                <SnapshotBlock
                                    label="After"
                                    json={log.newData}
                                />
                            </div>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

function SnapshotBlock({
    label,
    json,
}: {
    label: string;
    json: string | null;
}) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <pre className="max-h-64 scrollbar-none overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-[11px] text-gray-900 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-100">
                {json ? prettyPrint(json) : '—'}
            </pre>
        </div>
    );
}

function prettyPrint(json: string): string {
    try {
        return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
        return json;
    }
}
