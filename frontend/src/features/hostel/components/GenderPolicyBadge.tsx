import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { genderPolicyColors, genderPolicyLabel } from '../utils/hostel.utils';
import type { GenderPolicy } from '../types/hostel.types';

interface GenderPolicyBadgeProps {
    policy: GenderPolicy;
    /** When true, renders without a border (for use on colored backgrounds). */
    borderless?: boolean;
    className?: string;
}

/**
 * Displays the gender policy of a hostel as a small, color-coded badge.
 *
 * Color coding:
 *  - Male Only  → blue
 *  - Female Only → pink
 *  - Mixed      → purple
 *
 * @example
 * ```tsx
 * <GenderPolicyBadge policy="MALE_ONLY" />
 * ```
 */
export function GenderPolicyBadge({
    policy,
    borderless = false,
    className,
}: GenderPolicyBadgeProps) {
    const colors = genderPolicyColors(policy);

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                colors?.bg,
                colors?.text,
                !borderless && `border ${colors?.border}`,
                className
            )}
        >
            <Users className="h-3 w-3" aria-hidden="true" />
            {genderPolicyLabel(policy)}
        </span>
    );
}
