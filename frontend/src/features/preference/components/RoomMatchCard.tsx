import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BedDouble, ChevronRight, Sparkles, Users } from 'lucide-react';
import { PreferenceTagBadge } from './PreferenceTagBadge';
import { matchCountLabel } from '../utils/preference.utils';
import {
    formatPrice,
    roomImageFallback,
    roomTypeLabel,
} from '@/features/room/utils/room.utils';
import type { RoomMatchSuggestionDto } from '../types/preference.types';
import { ZoomableImage } from '@/components/ui/ZoomableImage';

// =============================================================================
// Types
// =============================================================================

interface RoomMatchCardProps {
    suggestion: RoomMatchSuggestionDto;
    /** UUID of the hostel this room belongs to — required to build the detail link. */
    hostelId: string;
    /**
     * Visual rank of this suggestion (1-based).
     * Position 1 gets a "Best Match" accent; others are rendered neutrally.
     */
    rank: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Card displaying a single roommate-matched room suggestion.
 *
 * **Layout:**
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │ [Room thumbnail]  Room #  ·  Type      Price / semester │ ›
 * │                   Beds available · Occupants            │
 * │                   [Matching tag chips…]                  │
 * │                   "N shared interests"                   │
 * └─────────────────────────────────────────────────────────┘
 * ```
 *
 * The matching tags (overlap between the student and at least one occupant)
 * are the core UX of this card — they explain *why* this room was suggested.
 * The first suggestion (rank 1) gets a "Best Match" badge to anchor attention.
 *
 * Clicking the card navigates to the full room detail page where the student
 * can book or join the waitlist.
 *
 * @example
 * ```tsx
 * {result.suggestions.map((s, i) => (
 *   <RoomMatchCard
 *     key={s.roomId}
 *     suggestion={s}
 *     hostelId={hostelId}
 *     rank={i + 1}
 *   />
 * ))}
 * ```
 */
export function RoomMatchCard({
    suggestion,
    hostelId,
    rank,
}: RoomMatchCardProps) {
    const navigate = useNavigate();
    const isBestMatch = rank === 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.25,
                delay: rank * 0.04,
                ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
        >
            <button
                type="button"
                onClick={() =>
                    navigate(`/hostels/${hostelId}/rooms/${suggestion.roomId}`)
                }
                className="group flex w-full items-start gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 text-left transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none dark:border-gray-800 dark:bg-gray-950"
                aria-label={`View room ${suggestion.roomNumber} — ${matchCountLabel(suggestion.matchingTags.length)}`}
            >
                {/* ── Thumbnail ───────────────────────────────────────────── */}
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    <ZoomableImage
                        src={suggestion.imageUrl || roomImageFallback()}
                        alt={`Room ${suggestion.roomNumber}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                                roomImageFallback();
                        }}
                    />

                    {/* "Best Match" badge — rank 1 only */}
                    {isBestMatch && (
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 rounded-md bg-emerald-600 px-1.5 py-0.5">
                            <Sparkles
                                className="h-2.5 w-2.5 text-white"
                                aria-hidden="true"
                            />
                            <span className="text-[10px] font-semibold text-white">
                                Best
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Content ─────────────────────────────────────────────── */}
                <div className="min-w-0 flex-1 space-y-2">
                    {/* Header: room number, type, price */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Room {suggestion.roomNumber}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {roomTypeLabel(suggestion.roomType)}
                            </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-gray-900 dark:text-gray-100">
                            {formatPrice(suggestion.pricePerSemester)}
                            <span className="ml-0.5 text-xs font-normal text-gray-400">
                                /sem
                            </span>
                        </p>
                    </div>

                    {/* Bed + occupant count */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                            <BedDouble
                                className="h-3 w-3 shrink-0"
                                aria-hidden="true"
                            />
                            {suggestion.bedsAvailable}{' '}
                            {suggestion.bedsAvailable === 1 ? 'bed' : 'beds'}{' '}
                            free
                        </span>
                        <span className="flex items-center gap-1">
                            <Users
                                className="h-3 w-3 shrink-0"
                                aria-hidden="true"
                            />
                            {suggestion.occupantCount} current{' '}
                            {suggestion.occupantCount === 1
                                ? 'occupant'
                                : 'occupants'}
                        </span>
                    </div>

                    {/* Matching tags — the *reason* for this suggestion */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                            {matchCountLabel(suggestion.matchingTags.length)}{' '}
                            with current occupants
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {suggestion.matchingTags.map((tag) => (
                                <PreferenceTagBadge
                                    key={tag}
                                    tag={tag}
                                    size="sm"
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Chevron affordance ──────────────────────────────────── */}
                <ChevronRight
                    className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400"
                    aria-hidden="true"
                />
            </button>
        </motion.div>
    );
}

// =============================================================================
// Skeleton
// =============================================================================

/**
 * Animated skeleton matching the {@link RoomMatchCard} layout.
 * Shown while the match results are loading.
 */
export function RoomMatchCardSkeleton() {
    return (
        <div
            className="flex items-start gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950"
            aria-hidden="true"
        >
            <div className="h-24 w-32 shrink-0 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            <div className="flex-1 space-y-2.5 pt-0.5">
                <div className="flex justify-between">
                    <div className="space-y-1">
                        <div className="h-4 w-24 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-16 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="h-4 w-20 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="h-3 w-32 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                <div className="flex gap-1.5">
                    <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                    <div className="h-5 w-18 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                </div>
            </div>
        </div>
    );
}
