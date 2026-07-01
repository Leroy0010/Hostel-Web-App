import { positionBadgeColors, positionLabel } from '../utils/waitlist.utils';

interface WaitlistPositionBadgeProps {
    position: number;
    /** When true renders a compact pill; default renders a larger card-style badge. */
    compact?: boolean;
}

/**
 * Displays a student's 1-based queue position with contextual coloring.
 *
 * Colors:
 *  - Position 1 → amber  (next to be promoted)
 *  - Position 2-3 → blue (close to front)
 *  - Position 4+ → gray  (further back)
 *
 * @example
 * // In a card:
 * <WaitlistPositionBadge position={entry.position} />
 *
 * // Compact pill in a table:
 * <WaitlistPositionBadge position={entry.position} compact />
 */
export function WaitlistPositionBadge({
    position,
    compact = false,
}: WaitlistPositionBadgeProps) {
    const { bg, text, border } = positionBadgeColors(position);

    if (compact) {
        return (
            <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${bg} ${text} ${border}`}
            >
                #{position}
            </span>
        );
    }

    return (
        <div
            className={`inline-flex flex-col items-center rounded-xl border px-4 py-3 ${bg} ${border}`}
        >
            <span className={`text-2xl font-bold ${text}`}>
                {positionLabel(position)}
            </span>
            <span className={`mt-0.5 text-xs font-medium ${text} opacity-80`}>
                in queue
            </span>
        </div>
    );
}
