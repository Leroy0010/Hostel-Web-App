import { motion, type Transition } from 'framer-motion';
import { Check } from 'lucide-react';
import {
    tagColors,
    tagEmoji,
    tagLabel,
    PREFERENCE_TAG_GROUPS,
} from '../utils/preference.utils';
import type { PreferenceTag } from '../types/preference.types';

// =============================================================================
// Types
// =============================================================================

interface PreferenceTagSelectorProps {
    /** Currently selected tags — controlled component. */
    selected: PreferenceTag[];
    /** Called with the updated tag array whenever a tag is toggled. */
    onChange: (tags: PreferenceTag[]) => void;
    /** Max tags the user may select. Reflects the backend limit of 10. */
    maxTags?: number;
    /** When true, all buttons are disabled (e.g. while a save is in-flight). */
    disabled?: boolean;
}

// =============================================================================
// Animation variants
// =============================================================================

const groupVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
};

const tagVariants = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } as Transition,
    },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Interactive multi-select tag picker for the student preferences form.
 *
 * Enforces mutual exclusivity within semantic groups so users cannot select
 * opposing tags (e.g., picking both NIGHT_OWL and EARLY_BIRD). Selecting an
 * opposing tag automatically deselects its partner.
 */
export function PreferenceTagSelector({
    selected,
    onChange,
    maxTags = 10,
    disabled = false,
}: PreferenceTagSelectorProps) {
    const selectedSet = new Set(selected);
    const atMax = selected.length >= maxTags;

    /** Toggles a single tag and auto-removes conflicting options in its group */
    const toggle = (tag: PreferenceTag) => {
        if (selectedSet.has(tag)) {
            // Always allow deselection
            onChange(selected.filter((t) => t !== tag));
            return;
        }

        // Find the group this tag belongs to
        const currentGroup = PREFERENCE_TAG_GROUPS.find((g) =>
            g.tags.includes(tag)
        );

        // Filter out any other tags from this exact semantic group
        const cleanedSelected = currentGroup
            ? selected.filter((t) => !currentGroup.tags.includes(t))
            : selected;

        // Check the max tags limit against the newly cleaned array
        if (cleanedSelected.length < maxTags) {
            onChange([...cleanedSelected, tag]);
        }
    };

    return (
        <div className="space-y-5">
            {/* Selection count indicator */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                    Select the tags that best describe your lifestyle. (One per
                    category).
                </p>
                <span
                    className={`text-xs font-medium tabular-nums transition-colors duration-150 ${
                        atMax
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-400 dark:text-gray-500'
                    }`}
                    aria-live="polite"
                    aria-label={`${selected.length} of ${maxTags} tags selected`}
                >
                    {selected.length}/{maxTags}
                </span>
            </div>

            {/* Tag groups */}
            {PREFERENCE_TAG_GROUPS.map((group) => {
                // Determine if a tag from this group is already picked
                const hasSelectionInGroup = group.tags.some((t) =>
                    selectedSet.has(t)
                );

                return (
                    <div key={group.label} className="space-y-2">
                        {/* Group label */}
                        <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                            {group.label}
                        </p>

                        {/* Tag buttons */}
                        <motion.div
                            variants={groupVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex flex-wrap gap-2"
                        >
                            {group.tags.map((tag) => {
                                const isSelected = selectedSet.has(tag);

                                // Disable if global disabled is true OR if the overall
                                // limit is reached (unless swapping an option in this group)
                                const isDisabled =
                                    disabled ||
                                    (!isSelected &&
                                        atMax &&
                                        !hasSelectionInGroup);

                                const { bg, text, border } = tagColors(tag);

                                return (
                                    <motion.button
                                        key={tag}
                                        variants={tagVariants}
                                        type="button"
                                        onClick={() => toggle(tag)}
                                        disabled={isDisabled}
                                        aria-pressed={isSelected}
                                        aria-label={`${tagLabel(tag)} — ${isSelected ? 'selected, click to remove' : 'click to select'}`}
                                        className={[
                                            // Base layout
                                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
                                            'transition-all duration-150',
                                            'focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none',
                                            // Selected state
                                            isSelected
                                                ? `${bg} ${text} ${border} shadow-sm`
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800',
                                            // Disabled state
                                            isDisabled && !isSelected
                                                ? 'cursor-not-allowed opacity-40'
                                                : 'cursor-pointer',
                                        ].join(' ')}
                                    >
                                        <span aria-hidden="true">
                                            {tagEmoji(tag)}
                                        </span>
                                        {tagLabel(tag)}
                                        {isSelected && (
                                            <Check
                                                className="h-3 w-3 shrink-0"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    </div>
                );
            })}

            {/* Max-reached hint */}
            {atMax && (
                <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-amber-600 dark:text-amber-400"
                >
                    Maximum of {maxTags} tags reached. Deselect one to choose a
                    different tag.
                </motion.p>
            )}
        </div>
    );
}
