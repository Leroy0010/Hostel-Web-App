import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface PageHeaderProps {
    /** Primary page title. */
    title: string;
    /** Optional supporting subtitle or description. */
    description?: string;
    /** Optional slot for buttons, badges, or other controls in the top-right. */
    actions?: ReactNode;
    /** Optional className on the wrapper. */
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Consistent page-level header used at the top of every protected page.
 *
 * Provides:
 *  - A clear page title (h1) with strong typography.
 *  - An optional subtitle for supporting context.
 *  - A right-side actions slot for CTAs like "Create hostel" or "Add room".
 *
 * Per agent2.md §8, every screen must have a clear page title and
 * consistent spacing. This component guarantees both.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Hostels"
 *   description="Browse and manage accommodation"
 *   actions={<Button onClick={onCreate}>New Hostel</Button>}
 * />
 * ```
 */
export function PageHeader({
    title,
    description,
    actions,
    className,
}: PageHeaderProps) {
    return (
        <div
            className={cn(
                'flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between',
                className
            )}
        >
            {/* Title + description */}
            <div className="min-w-0 space-y-0.5">
                <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {description}
                    </p>
                )}
            </div>

            {/* Right-side actions */}
            {actions && (
                <div className="flex shrink-0 items-center gap-2 pt-1 sm:pt-0">
                    {actions}
                </div>
            )}
        </div>
    );
}
