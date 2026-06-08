import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface EmptyStateProps {
    /** Lucide icon or any React node rendered above the title. */
    icon: ReactNode;
    /** Primary empty-state heading. */
    title: string;
    /** Supporting description text. */
    description: string;
    /** Optional primary CTA button (e.g. "Create hostel" or "Retry"). */
    action?: ReactNode;
    /** Optional additional className on the wrapper. */
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Generic empty-state display used across all list and table views.
 *
 * Per agent2.md §8 UI/UX Standards, every list or table must have:
 *  - An empty-state illustration or icon.
 *  - A helpful message.
 *  - A primary action button.
 *
 * This component satisfies all three requirements in a reusable, consistent way.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<Building className="h-8 w-8 text-gray-400" />}
 *   title="No hostels found"
 *   description="Try adjusting your filters or create a new hostel."
 *   action={<Button onClick={onCreate}>Create hostel</Button>}
 * />
 * ```
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-900/50',
                className
            )}
            role="status"
            aria-label={title}
        >
            {/* Icon container */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                {icon}
            </div>

            {/* Text */}
            <div className="max-w-sm space-y-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {description}
                </p>
            </div>

            {/* Optional CTA */}
            {action && <div className="mt-1">{action}</div>}
        </div>
    );
}
