interface UserStatusBadgeProps {
    isActive: boolean;
}

/**
 * Active/inactive status badge for user accounts.
 *
 * Reuses the same color semantics as {@link HostelStatusBadge} for visual
 * consistency across the admin panel.
 *
 * @example
 * ```tsx
 * <UserStatusBadge isActive={user.isActive} />
 * ```
 */
export function UserStatusBadge({ isActive }: UserStatusBadgeProps) {
    return isActive ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Active
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            Inactive
        </span>
    );
}
