import { CalendarCheck, CalendarX } from 'lucide-react';
import type { AvailablePeriodDto } from '@/features/hostel/types/hostel.types';

interface AvailablePeriodsBadgeProps {
    periods: AvailablePeriodDto[];
    /** When true, shows a compact single-line version for use in preview cards. */
    compact?: boolean;
}

/**
 * Displays the available booking periods for a room.
 *
 * **Full mode** (default): Renders each period as a labelled badge.
 * **Compact mode**: Renders a single short summary (e.g. "2 periods open").
 *
 * Shows a "Not available" state when {@code periods} is empty — this clearly
 * communicates to students that the room cannot be booked right now.
 *
 * Used in:
 * - {@link DetailedRoomCard} — full mode in the hostel detail room list.
 * - {@link RoomPreviewCard} — compact mode in the horizontal strip.
 *
 * @example
 * ```tsx
 * <AvailablePeriodsBadge periods={room.availablePeriods} />
 * <AvailablePeriodsBadge periods={room.availablePeriods} compact />
 * ```
 */
export function AvailablePeriodsBadge({
    periods,
    compact = false,
}: AvailablePeriodsBadgeProps) {
    const hasAvailability = periods.length > 0;

    // ── Compact mode ─────────────────────────────────────────────────────────
    if (compact) {
        return hasAvailability ? (
            <div className="flex items-center gap-1">
                <CalendarCheck
                    className="h-3 w-3 shrink-0 text-emerald-500 dark:text-emerald-400"
                    aria-hidden="true"
                />
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    {periods.length === 1
                        ? `${formatPeriod(periods[0])} open`
                        : `${periods.length} periods open`}
                </span>
            </div>
        ) : (
            <div className="flex items-center gap-1">
                <CalendarX
                    className="h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                />
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    Not available
                </span>
            </div>
        );
    }

    // ── Full mode ─────────────────────────────────────────────────────────────
    if (!hasAvailability) {
        return (
            <div className="flex items-center gap-1.5">
                <CalendarX
                    className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                />
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    No available booking periods
                </span>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <CalendarCheck
                    className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400"
                    aria-hidden="true"
                />
                Available periods
            </p>
            <div className="flex flex-wrap gap-1.5">
                {periods.map((p) => (
                    <span
                        key={`${p.academicYear}-${p.semester}`}
                        className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                    >
                        {formatPeriod(p)}
                    </span>
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Formats a single available period into a human-readable label.
 *
 * @example
 * formatPeriod({ academicYear: '2024/2025', semester: 'FIRST' })
 * // → '2024/2025 · First'
 */
function formatPeriod(period: AvailablePeriodDto): string {
    const semester = formatSemester(period.semester);
    return `${period.academicYear} · ${semester}`;
}

/**
 * Converts a backend semester enum value to a display label.
 *
 * @example
 * formatSemester('FIRST')  // → 'First Sem'
 * formatSemester('SECOND') // → 'Second Sem'
 */
function formatSemester(semester: string): string {
    switch (semester.toUpperCase()) {
        case 'FIRST':
            return 'First Sem';
        case 'SECOND':
            return 'Second Sem';
        default:
            // Fall back to title-cased raw value for unknown semesters
            return semester.charAt(0).toUpperCase() + semester.slice(1).toLowerCase();
    }
}