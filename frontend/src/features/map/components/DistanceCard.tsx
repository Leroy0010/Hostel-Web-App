import { Footprints, MapPin, Clock } from 'lucide-react';
import { useDistance } from '../hooks/map.hooks';
import { formatDistanceLabel, formatWalkingTime } from '../utils/map.utils';

// =============================================================================
// Types
// =============================================================================

interface DistanceCardProps {
    hostelId: string;
    hostelName: string;
    landmarkId: string;
    landmarkName: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Inline card showing the calculated distance between a hostel and a landmark.
 *
 * Fetches the distance via {@code GET /api/landmarks/distance?hostelId=&landmarkId=}
 * which uses PostGIS {@code ST_Distance(geography, geography)} server-side for
 * accurate earth-surface distances in metres.
 *
 * Displays:
 *  - Straight-line distance (formatted as m or km).
 *  - Estimated walking time at 5 km/h (backend rounds up to nearest minute).
 *  - Origin → destination label for context.
 *
 * Used in the landmark info popup on {@link CampusMapPage} when a hostel
 * is selected and the user clicks a landmark marker.
 *
 * @example
 * ```tsx
 * <DistanceCard
 *   hostelId={selectedHostel.id}
 *   hostelName={selectedHostel.name}
 *   landmarkId={clickedLandmark.id}
 *   landmarkName={clickedLandmark.name}
 * />
 * ```
 */
export function DistanceCard({
    hostelId,
    hostelName,
    landmarkId,
    landmarkName,
}: DistanceCardProps) {
    const { data, isLoading, isError } = useDistance(hostelId, landmarkId);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    Calculating distance…
                </span>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-600">
                Distance unavailable — hostel or landmark may not have
                coordinates set.
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/50 dark:bg-blue-950/30">
            {/* Route label */}
            <div className="mb-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                <span className="truncate font-medium">{hostelName}</span>
                <span className="mx-1 text-blue-400">→</span>
                <span className="truncate font-medium">{landmarkName}</span>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <Footprints
                        className="h-4 w-4 text-blue-500 dark:text-blue-400"
                        aria-hidden="true"
                    />
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        {formatDistanceLabel(data.distanceMetres)}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <Clock
                        className="h-4 w-4 text-blue-400 dark:text-blue-500"
                        aria-hidden="true"
                    />
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                        {formatWalkingTime(data.walkingMinutes)}
                    </span>
                </div>
            </div>

            <p className="mt-1 text-[10px] text-blue-400 dark:text-blue-600">
                Straight-line distance · Walking at 5 km/h
            </p>
        </div>
    );
}
