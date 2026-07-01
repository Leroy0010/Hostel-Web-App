import { cn } from '@/lib/utils';
import {
    complaintCategoryColors,
    complaintCategoryLabel,
} from '../utils/complaint.utils';
import type { ComplaintCategory } from '../types/complaint.types';

// Category icon mapping using text emoji for zero-dependency display
const CATEGORY_ICONS: Record<ComplaintCategory, string> = {
    MAINTENANCE: '🔧',
    CLEANLINESS: '🧹',
    SECURITY: '🔒',
    NOISE: '🔊',
    BILLING: '💳',
    OTHER: '📋',
};

interface ComplaintCategoryBadgeProps {
    category: ComplaintCategory;
    /** When true, shows only icon without label text (for compact table cells). */
    iconOnly?: boolean;
    className?: string;
}

/**
 * Color-coded pill badge indicating a complaint's category.
 *
 * Each category has a distinct color to allow instant visual scanning of
 * complaint lists — a key HCI principle for tabular data.
 *
 * @example
 * ```tsx
 * <ComplaintCategoryBadge category="MAINTENANCE" />
 * <ComplaintCategoryBadge category="SECURITY" iconOnly />
 * ```
 */
export function ComplaintCategoryBadge({
    category,
    iconOnly = false,
    className,
}: ComplaintCategoryBadgeProps) {
    const colors = complaintCategoryColors(category);

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
                colors.bg,
                colors.text,
                colors.border,
                className
            )}
            title={iconOnly ? complaintCategoryLabel(category) : undefined}
        >
            <span aria-hidden="true">{CATEGORY_ICONS[category]}</span>
            {!iconOnly && complaintCategoryLabel(category)}
        </span>
    );
}
