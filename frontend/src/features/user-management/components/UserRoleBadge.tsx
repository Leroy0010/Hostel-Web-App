import type { UserRole } from '../types/user-management.types';

interface UserRoleBadgeProps {
    role: UserRole;
}

/**
 * Color-coded role badge for user accounts.
 *
 * Colors:
 *  - ADMIN   → purple (highest privilege)
 *  - MANAGER → blue
 *  - STUDENT → gray (neutral, most common)
 *
 * @example
 * ```tsx
 * <UserRoleBadge role={user.role} />
 * ```
 */
export function UserRoleBadge({ role }: UserRoleBadgeProps) {
    const styles: Record<UserRole, string> = {
        ADMIN: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/50 dark:bg-purple-950/30 dark:text-purple-300',
        MANAGER:
            'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300',
        STUDENT:
            'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400',
    };

    const labels: Record<UserRole, string> = {
        ADMIN: 'Admin',
        MANAGER: 'Manager',
        STUDENT: 'Student',
    };

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[role]}`}
        >
            {labels[role]}
        </span>
    );
}
