interface AuditActionBadgeProps {
    action: string;
}

/**
 * Color-coded badge for an audit log's machine-readable action code
 * (e.g. "USER_DEACTIVATED"). Color is derived from the trailing verb so new
 * action codes get a sensible color automatically without a lookup table
 * that needs updating every time a new {@code @Audited} method is added.
 *
 * @example
 * ```tsx
 * <AuditActionBadge action={log.action} />
 * ```
 */
export function AuditActionBadge({ action }: AuditActionBadgeProps) {
    const style = classifyAction(action);

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${style}`}
        >
            {formatAction(action)}
        </span>
    );
}

function classifyAction(action: string): string {
    if (
        action.endsWith('CREATED') ||
        action.endsWith('ASSIGNED') ||
        action.endsWith('ACTIVATED')
    ) {
        return 'border-green-200 bg-green-50 text-green-700 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300';
    }
    if (
        action.endsWith('DELETED') ||
        action.endsWith('DEACTIVATED') ||
        action.endsWith('UNASSIGNED')
    ) {
        return 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300';
    }
    if (action.endsWith('UPDATED') || action.endsWith('CHANGED')) {
        return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300';
    }
    return 'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400';
}

/** "USER_DEACTIVATED" → "User Deactivated" */
function formatAction(action: string): string {
    return action
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ');
}
