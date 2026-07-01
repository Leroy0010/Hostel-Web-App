import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import { useNearbyLandmarks } from '../hooks/map.hooks';
import {
    categoryIcon,
    categoryLabel,
    formatDistance,
    formatWalkingTime,
} from '../utils/map.utils';
import { cn } from '@/lib/utils';
import type { NearbyLandmarkDto } from '../types/map.types';

// =============================================================================
// Types
// =============================================================================

interface NearbyLandmarksPanelProps {
    /** UUID of the hostel to find landmarks near. */
    hostelId: string;
    /**
     * Search radius in metres. Defaults to 1000 m (1 km).
     * The backend default matches this value.
     */
    radiusMetres?: number;
    /**
     * Optional callback fired when the user clicks a landmark row.
     * Used on the {@link CampusMapPage} to wire the panel to the distance
     * calculator — clicking a nearby landmark triggers the DistanceCard.
     *
     * Not required when the panel is used in read-only mode (e.g. on
     * HostelDetailPage where the distance card is not present).
     */
    onLandmarkSelect?: (landmark: NearbyLandmarkDto) => void;
    /**
     * UUID of the currently selected landmark — used to highlight the
     * active row when the panel is used alongside a distance calculator.
     */
    selectedLandmarkId?: string;
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Panel displaying campus landmarks near a specific hostel, sorted
 * nearest-first. Distances and walking times are computed by the backend
 * using PostGIS {@code ST_Distance(geography, geography)}.
 *
 * **Usage contexts:**
 *
 * 1. **HostelDetailPage** — read-only; shows proximity context to students
 *    browsing accommodation options. No `onLandmarkSelect` needed.
 *    ```tsx
 *    {hostel.latitude && <NearbyLandmarksPanel hostelId={hostel.id} />}
 *    ```
 *
 * 2. **CampusMapPage** — interactive; clicking a row selects the landmark
 *    and triggers the DistanceCard calculation.
 *    ```tsx
 *    <NearbyLandmarksPanel
 *      hostelId={selectedHostel.id}
 *      onLandmarkSelect={(item) => setSelectedLandmark({ id: item.landmark.id, name: item.landmark.name })}
 *      selectedLandmarkId={selectedLandmark?.id}
 *    />
 *    ```
 */
export function NearbyLandmarksPanel({
    hostelId,
    radiusMetres = 1000,
    onLandmarkSelect,
    selectedLandmarkId,
    className,
}: NearbyLandmarksPanelProps) {
    const {
        data: landmarks,
        isLoading,
        isError,
    } = useNearbyLandmarks(hostelId, radiusMetres);

    const isInteractive = Boolean(onLandmarkSelect);

    return (
        <div
            className={cn(
                'rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <Navigation
                        className="h-4 w-4 text-gray-400 dark:text-gray-500"
                        aria-hidden="true"
                    />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Nearby Landmarks
                    </h3>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    within {formatDistance(radiusMetres)}
                </span>
            </div>

            {/* Interactive hint */}
            {isInteractive &&
                !isLoading &&
                landmarks &&
                landmarks.length > 0 && (
                    <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-600">
                        Click a landmark to calculate distance
                    </p>
                )}

            {/* Content */}
            {isLoading ? (
                <NearbyLandmarksSkeleton />
            ) : isError ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-600">
                    Could not load nearby landmarks.
                </div>
            ) : !landmarks || landmarks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                    <MapPin
                        className="h-6 w-6 text-gray-300 dark:text-gray-700"
                        aria-hidden="true"
                    />
                    <p className="text-sm text-gray-400 dark:text-gray-600">
                        No landmarks within {formatDistance(radiusMetres)}.
                    </p>
                </div>
            ) : (
                <ul
                    className="divide-y divide-gray-100 dark:divide-gray-800"
                    role="list"
                    aria-label="Nearby landmarks"
                >
                    <AnimatePresence initial={false}>
                        {landmarks.map((item, index) => {
                            const isSelected =
                                selectedLandmarkId === item.landmark.id;

                            return (
                                <motion.li
                                    key={item.landmark.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.22,
                                        delay: index * 0.04,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                >
                                    {isInteractive ? (
                                        /* Interactive row — button */
                                        <button
                                            type="button"
                                            className={cn(
                                                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150',
                                                'focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none focus-visible:ring-inset',
                                                isSelected
                                                    ? 'bg-gray-50 dark:bg-gray-900/60'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                                            )}
                                            onClick={() =>
                                                onLandmarkSelect?.(item)
                                            }
                                            aria-pressed={isSelected}
                                            aria-label={`Select ${item.landmark.name} — ${formatDistance(item.distanceMetres)}`}
                                        >
                                            <LandmarkRowContent
                                                item={item}
                                                isSelected={isSelected}
                                            />
                                        </button>
                                    ) : (
                                        /* Read-only row — div */
                                        <div className="flex items-center gap-3 px-4 py-3">
                                            <LandmarkRowContent item={item} />
                                        </div>
                                    )}
                                </motion.li>
                            );
                        })}
                    </AnimatePresence>
                </ul>
            )}
        </div>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================

/**
 * Shared row layout used in both interactive (button) and read-only (div) modes.
 */
function LandmarkRowContent({
    item,
    isSelected = false,
}: {
    item: NearbyLandmarkDto;
    isSelected?: boolean;
}) {
    return (
        <>
            {/* Category icon */}
            <div
                className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    isSelected
                        ? 'bg-gray-200 dark:bg-gray-700'
                        : 'bg-gray-100 dark:bg-gray-800'
                )}
            >
                <span className="text-base" aria-hidden="true">
                    {categoryIcon(item.landmark.category)}
                </span>
            </div>

            {/* Name + category */}
            <div className="min-w-0 flex-1 text-left">
                <p
                    className={cn(
                        'truncate text-sm font-medium',
                        isSelected
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-800 dark:text-gray-200'
                    )}
                >
                    {item.landmark.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                    {categoryLabel(item.landmark.category)}
                </p>
            </div>

            {/* Distance + walk time */}
            <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {formatDistance(item.distanceMetres)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatWalkingTime(item.walkingMinutes)}
                </p>
            </div>
        </>
    );
}

// =============================================================================
// Skeleton
// =============================================================================

function NearbyLandmarksSkeleton() {
    return (
        <ul aria-hidden="true" aria-label="Loading landmarks">
            {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="space-y-1 text-right">
                        <div className="h-3.5 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                </li>
            ))}
        </ul>
    );
}
