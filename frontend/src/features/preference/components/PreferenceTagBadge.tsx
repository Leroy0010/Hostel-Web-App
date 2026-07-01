import { tagColors, tagEmoji, tagLabel } from '../utils/preference.utils';
import type { PreferenceTag } from '../types/preference.types';

interface PreferenceTagBadgeProps {
    tag: PreferenceTag;
    /**
     * Visual size variant.
     * - `sm` — compact pill for match-reason chips (default).
     * - `md` — standard pill for profile display.
     */
    size?: 'sm' | 'md';
    /** When true, renders without the emoji prefix. Useful in dense layouts. */
    hideEmoji?: boolean;
}

/**
 * Read-only display badge for a single preference tag.
 *
 * Uses semantic colors (via {@link tagColors}) and an emoji prefix (via
 * {@link tagEmoji}) to make tags scannable at a glance. Each tag always
 * gets the same color regardless of context so students build a mental
 * model quickly.
 *
 * **Not** a toggle — use {@link PreferenceTagSelector} when the user needs
 * to select/deselect tags.
 *
 * @example
 * ```tsx
 * // In a match card — compact chips
 * {suggestion.matchingTags.map(tag => (
 *   <PreferenceTagBadge key={tag} tag={tag} size="sm" />
 * ))}
 *
 * // In a student profile — medium pills
 * {preferences.tags.map(tag => (
 *   <PreferenceTagBadge key={tag} tag={tag} size="md" />
 * ))}
 * ```
 */
export function PreferenceTagBadge({
    tag,
    size = 'sm',
    hideEmoji = false,
}: PreferenceTagBadgeProps) {
    const { bg, text, border } = tagColors(tag);

    const sizeClasses =
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border font-medium ${bg} ${text} ${border} ${sizeClasses}`}
        >
            {!hideEmoji && <span aria-hidden="true">{tagEmoji(tag)}</span>}
            {tagLabel(tag)}
        </span>
    );
}
