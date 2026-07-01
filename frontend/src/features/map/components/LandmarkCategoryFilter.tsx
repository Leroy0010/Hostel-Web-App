import { cn } from '@/lib/utils';
import {
    categoryColors,
    categoryIcon,
    categoryLabel,
} from '../utils/map.utils';
import type { LandmarkCategory } from '../types/map.types';

// =============================================================================
// Types
// =============================================================================

const ALL_CATEGORIES: LandmarkCategory[] = [
    'ACADEMIC',
    'LIBRARY',
    'ADMINISTRATIVE',
    'CAFETERIA',
    'MEDICAL',
    'SPORTS',
    'HOSTEL',
    'OTHER',
];

interface LandmarkCategoryFilterProps {
    /**
     * Currently active category filter.
     * {@code undefined} means "All" — no category filter applied.
     */
    selected: LandmarkCategory | undefined;
    /** Called with the new selection. Passing {@code undefined} clears the filter. */
    onChange: (category: LandmarkCategory | undefined) => void;
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Horizontal scrolling category filter pill bar for the campus map.
 *
 * UX decisions:
 *  - An "All" pill is always shown first.
 *  - Each category pill shows its emoji icon + text label.
 *  - The selected pill uses a filled colour from the category's palette.
 *  - Clicking the same active category again clears the filter (toggle).
 *  - The bar hides its scrollbar via {@code scrollbar-none} for a clean look.
 *  - Each pill meets the WCAG 2.5.5 minimum touch target (≥ 44×44 px logical).
 *  - {@code aria-pressed} communicates selection state to screen readers.
 */
export function LandmarkCategoryFilter({
    selected,
    onChange,
    className,
}: LandmarkCategoryFilterProps) {
    return (
        <div
            className={cn(
                'flex scrollbar-none gap-2 overflow-x-auto py-1',
                className
            )}
            role="group"
            aria-label="Filter landmarks by category"
        >
            {/* All pill */}
            <FilterPill
                label="All"
                icon="🗺️"
                isActive={!selected}
                onClick={() => onChange(undefined)}
                activeBg="bg-gray-900 dark:bg-white"
                activeText="text-white dark:text-gray-950"
            />

            {/* Category pills */}
            {ALL_CATEGORIES.map((cat) => {
                const colors = categoryColors(cat);
                return (
                    <FilterPill
                        key={cat}
                        label={categoryLabel(cat)}
                        icon={categoryIcon(cat)}
                        isActive={selected === cat}
                        onClick={() =>
                            onChange(selected === cat ? undefined : cat)
                        }
                        activeBg={colors.activeBg}
                        activeText={colors.activeText}
                        inactiveBg={colors.bg}
                        inactiveText={colors.text}
                        inactiveBorder={colors.border}
                    />
                );
            })}
        </div>
    );
}

// =============================================================================
// Internal FilterPill
// =============================================================================

interface FilterPillProps {
    label: string;
    icon: string;
    isActive: boolean;
    onClick: () => void;
    activeBg: string;
    activeText: string;
    inactiveBg?: string;
    inactiveText?: string;
    inactiveBorder?: string;
}

function FilterPill({
    label,
    icon,
    isActive,
    onClick,
    activeBg,
    activeText,
    inactiveBg = 'bg-white dark:bg-gray-950',
    inactiveText = 'text-gray-700 dark:text-gray-300',
    inactiveBorder = 'border-gray-200 dark:border-gray-800',
}: FilterPillProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isActive}
            className={cn(
                // Base
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
                // Transitions + accessibility
                'transition-all duration-150',
                'focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none',
                // Touch target
                'min-h-9',
                // Active vs inactive
                isActive
                    ? `${activeBg} ${activeText} border-transparent shadow-sm`
                    : `${inactiveBg} ${inactiveText} ${inactiveBorder} hover:opacity-80`
            )}
        >
            <span aria-hidden="true">{icon}</span>
            {label}
        </button>
    );
}
