import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Loader2, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import {
    Map,
    MapControls,
    MapMarker,
    MarkerContent,
    MarkerPopup,
    MarkerTooltip,
    type MapRef,
} from '@/components/ui/map';
import { LandmarkCategoryFilter } from '../components/LandmarkCategoryFilter';
import { NearbyLandmarksPanel } from '../components/NearbyLandmarksPanel';
import { DistanceCard } from '../components/DistanceCard';
import { useAllLandmarks } from '../hooks/map.hooks';
import { useActiveHostels } from '@/features/hostel/hooks/hostel.hooks';
import {
    categoryEmoji,
    categoryLabel,
    UCC_DEFAULT_ZOOM,
} from '../utils/map.utils';
import type {
    LandmarkCategory,
    LandmarkDto,
    NearbyLandmarkDto,
} from '../types/map.types';
import type { HostelSummaryDto } from '@/features/hostel/types/hostel.types';

// =============================================================================
// Constants
// =============================================================================

/**
 * UCC map centre in [lng, lat] order — MapLibre GL convention.
 * (UCC_CENTER in map.utils is [lat, lng] for Leaflet; this is corrected here.)
 */
const MAP_CENTER: [number, number] = [-1.2935249759278458, 5.114141856406612];

// =============================================================================
// Internal types
// =============================================================================

interface SelectedHostel {
    id: string;
    name: string;
    lat: number;
    lng: number;
}

interface SelectedLandmark {
    id: string;
    name: string;
}

// =============================================================================
// Small presentational sub-components
// =============================================================================

/**
 * Teardrop-shaped hostel map pin.
 * Mirrors the Leaflet divIcon shape: rotated square, counter-rotated emoji.
 */
function HostelPin({
    selected,
    height = 30,
    width = 30,
    fontSize = 14,
}: {
    selected: boolean;
    width?: number;
    height?: number;
    fontSize?: number;
}) {
    return (
        <div
            className="flex cursor-pointer items-center justify-center border-2 border-white shadow-md transition-colors duration-200"
            style={{
                background: selected ? '#0f172a' : '#0d9488',
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                width: width,
                height: height,
            }}
            aria-hidden="true"
        >
            {/* Counter-rotate the emoji so it stays upright */}
            <span style={{ transform: 'rotate(45deg)', fontSize: fontSize }}>
                🏠
            </span>
        </div>
    );
}

/**
 * Pill-shaped landmark label with emoji + name.
 * Mirrors the Leaflet custom divIcon pill style.
 */
function LandmarkPill({ emoji, name }: { emoji: string; name: string }) {
    return (
        <div className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-white/90 px-2 py-1 whitespace-nowrap shadow-md dark:border-gray-700 dark:bg-gray-900/90">
            <span className="text-base leading-none">{emoji}</span>
            <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                {name}
            </span>
        </div>
    );
}

// =============================================================================
// Page component
// =============================================================================

/**
 * Interactive UCC campus map — powered by MapCn (MapLibre GL).
 *
 * Hostel flow:
 *  1. Teal teardrop pins mark hostels with stored coordinates.
 *  2. Clicking a pin → flyTo that hostel, show NearbyLandmarksPanel.
 *  3. Clicking a landmark row → show DistanceCard (metres + walk time).
 *  4. "View hostel details" → navigates to /hostels/:id.
 *
 * Landmark deduplication:
 *  HOSTEL-category landmarks that share a name with an active hostel are
 *  suppressed so their real hostel pin takes precedence.
 *
 * Route: /map
 */
export default function CampusMap() {
    const navigate = useNavigate();
    const mapRef = useRef<MapRef>(null);

    const [activeCategory, setActiveCategory] = useState<
        LandmarkCategory | undefined
    >(undefined);
    const [selectedHostel, setSelectedHostel] = useState<SelectedHostel | null>(
        null
    );
    const [selectedLandmark, setSelectedLandmark] =
        useState<SelectedLandmark | null>(null);

    // ── Data ──────────────────────────────────────────────────────────────────

    const {
        data: landmarks = [],
        isLoading: isLoadingLandmarks,
        isFetching: isFetchingLandmarks,
    } = useAllLandmarks(activeCategory);

    const { data: hostelPage } = useActiveHostels({ size: 100 });
    const hostels = useMemo(
        () => hostelPage?.content ?? [],
        [hostelPage?.content]
    );

    /**
     * Landmarks with HOSTEL-category entries deduplicated against the real
     * hostel list — mirrors the Leaflet version's distinctLandmarks filter.
     */
    const distinctLandmarks = useMemo(
        () =>
            landmarks.filter((landmark: LandmarkDto) => {
                if (landmark.category !== 'HOSTEL') return true;
                return !hostels.some((h) => h.id === landmark.hostelId);
            }),
        [landmarks, hostels]
    );

    // ── Fly to selected hostel ────────────────────────────────────────────────

    useEffect(() => {
        if (!selectedHostel) return;
        mapRef.current?.flyTo({
            center: [selectedHostel.lng, selectedHostel.lat],
            zoom: 17,
            duration: 1200,
        });
    }, [selectedHostel]);

    // ── Event handlers ────────────────────────────────────────────────────────

    const handleHostelClick = useCallback((hostel: HostelSummaryDto) => {
        const { latitude: lat, longitude: lng } = hostel;
        if (!lat || !lng) return;
        setSelectedHostel({ id: hostel.id, name: hostel.name, lat, lng });
        setSelectedLandmark(null);
    }, []);

    /**
     * Landmark marker click — handles the edge case where a HOSTEL-category
     * landmark was not deduplicated (no matching active hostel) so it falls
     * through to a normal landmark selection.
     */
    const handleLandmarkClick = useCallback(
        (landmark: LandmarkDto) => {
            if (landmark.category === 'HOSTEL') {
                const matched = hostels.find(
                    (h) =>
                        h.name.toLowerCase() === landmark.name.toLowerCase() &&
                        h.latitude &&
                        h.longitude
                );
                if (matched) {
                    setSelectedHostel({
                        id: matched.id,
                        name: matched.name,
                        lat: matched.latitude!,
                        lng: matched.longitude!,
                    });
                    setSelectedLandmark(null);
                    return;
                }
            }
            setSelectedLandmark({ id: landmark.id, name: landmark.name });
        },
        [hostels]
    );

    const handleLandmarkSelect = useCallback((item: NearbyLandmarkDto) => {
        setSelectedLandmark({
            id: item.landmark.id,
            name: item.landmark.name,
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedHostel(null);
        setSelectedLandmark(null);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
        >
            <PageHeader
                title="Campus Map"
                description="Explore hostels and landmarks on the UCC campus. Click a hostel pin to see nearby facilities."
            />

            {/* ── Category filter chips ──────────────────────────────────── */}
            <LandmarkCategoryFilter
                selected={activeCategory}
                onChange={setActiveCategory}
            />

            <div className="flex flex-col gap-4 lg:flex-row">
                {/* ── Map ───────────────────────────────────────────────── */}
                <div className="relative h-120 w-full lg:flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 lg:h-150 dark:border-gray-800 dark:bg-gray-800">
                    <Map
                        ref={mapRef}
                        attributionControl={false}
                        center={MAP_CENTER}
                        zoom={UCC_DEFAULT_ZOOM - 1}
                    >
                        <MapControls
                            position="top-right"
                            showZoom
                            showCompass
                            showLocate
                            showFullscreen
                        />

                        {/* ── Hostel markers ──────────────────────────── */}
                        {hostels.map((hostel) => {
                            const { latitude: lat, longitude: lng } = hostel;
                            if (!lat || !lng) return null;
                            const isSelected = selectedHostel?.id === hostel.id;

                            return (
                                <MapMarker
                                    key={hostel.id}
                                    longitude={lng}
                                    latitude={lat}
                                >
                                    <MarkerContent>
                                        {/*
                                         * onClick updates React state in addition to
                                         * the popup that MarkerContent opens on click.
                                         */}
                                        <div
                                            onClick={() =>
                                                handleHostelClick(hostel)
                                            }
                                        >
                                            <HostelPin selected={isSelected} />
                                        </div>
                                    </MarkerContent>
                                    <MarkerTooltip>{hostel.name}</MarkerTooltip>
                                    <MarkerPopup>
                                        <div className="min-w-40 space-y-2">
                                            <div>
                                                <p className="font-semibold text-foreground">
                                                    {hostel.name}
                                                </p>
                                                {hostel.address && (
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {hostel.address}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                className="w-full"
                                                onClick={() =>
                                                    navigate(
                                                        `/hostels/${hostel.id}`
                                                    )
                                                }
                                            >
                                                View hostel details
                                            </Button>
                                        </div>
                                    </MarkerPopup>
                                </MapMarker>
                            );
                        })}

                        {/* ── Landmark markers ────────────────────────── */}
                        {distinctLandmarks.map((landmark: LandmarkDto) => (
                            <MapMarker
                                key={landmark.id}
                                longitude={landmark.longitude}
                                latitude={landmark.latitude}
                            >
                                <MarkerContent>
                                    <div
                                        onClick={() =>
                                            handleLandmarkClick(landmark)
                                        }
                                    >
                                        <LandmarkPill
                                            emoji={categoryEmoji(
                                                landmark.category
                                            )}
                                            name={landmark.name}
                                        />
                                    </div>
                                </MarkerContent>
                                <MarkerTooltip>{landmark.name}</MarkerTooltip>
                                <MarkerPopup>
                                    <div className="min-w-40 space-y-1">
                                        <p className="font-medium text-foreground">
                                            {landmark.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {categoryLabel(landmark.category)}
                                        </p>
                                        {landmark.description && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {landmark.description}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {landmark.latitude.toFixed(4)},{' '}
                                            {landmark.longitude.toFixed(4)}
                                        </p>
                                    </div>
                                </MarkerPopup>
                            </MapMarker>
                        ))}
                    </Map>

                    {/* Landmark-fetch spinner ──────────────────────────── */}
                    {isFetchingLandmarks && (
                        <div className="absolute top-3 right-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-white/90 px-2.5 py-1.5 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/90">
                            <Loader2
                                className="h-3.5 w-3.5 animate-spin text-gray-500 dark:text-gray-400"
                                aria-hidden="true"
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                Updating pins…
                            </span>
                        </div>
                    )}

                    {/* Legend ──────────────────────────────────────────── */}
                    <div className="absolute bottom-3 left-3 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/90">
                        <p className="mb-1 text-[10px] font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                            Legend
                        </p>
                        <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                <HostelPin
                                    width={14}
                                    height={14}
                                    fontSize={8}
                                    selected={false}
                                />{' '}
                                Active Platform Hostels
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                🏠 Non Active Hostel
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                📍 Landmark
                            </span>
                        </div>
                    </div>

                    {/* Empty state for active category filter ─────────── */}
                    {!isLoadingLandmarks &&
                        activeCategory &&
                        distinctLandmarks.length === 0 && (
                            <div className="absolute inset-x-0 top-3 mx-auto flex max-w-xs items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-700 backdrop-blur-sm dark:border-amber-800/50 dark:bg-amber-950/80 dark:text-amber-300">
                                <Info
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                No {categoryLabel(activeCategory)} landmarks on
                                the map yet.
                            </div>
                        )}
                </div>

                {/* ── Side panel ────────────────────────────────────────── */}
                <div className="flex w-full flex-col gap-3 lg:w-80">
                    {/* Distance card — visible when hostel + landmark both selected */}
                    <AnimatePresence>
                        {selectedHostel && selectedLandmark && (
                            <motion.div
                                key="distance"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                            >
                                <DistanceCard
                                    hostelId={selectedHostel.id}
                                    hostelName={selectedHostel.name}
                                    landmarkId={selectedLandmark.id}
                                    landmarkName={selectedLandmark.name}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Hostel selection card / empty-selection placeholder */}
                    <AnimatePresence mode="wait">
                        {selectedHostel ? (
                            <motion.div
                                key={selectedHostel.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                                            Selected hostel
                                        </p>
                                        <p className="mt-0.5 truncate font-semibold text-gray-900 dark:text-gray-100">
                                            {selectedHostel.name}
                                        </p>
                                        {selectedLandmark && (
                                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                                Distance to:{' '}
                                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                                    {selectedLandmark.name}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearSelection}
                                        aria-label="Clear hostel selection"
                                        className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <Button
                                    size="sm"
                                    onClick={() =>
                                        navigate(
                                            `/hostels/${selectedHostel.id}`
                                        )
                                    }
                                    className="mt-3 w-full bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                                >
                                    View hostel details
                                </Button>

                                {!selectedLandmark && (
                                    <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-400 dark:text-gray-600">
                                        <Info
                                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        Click a landmark row below to calculate
                                        walking distance.
                                    </p>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty-selection"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center dark:border-gray-800 dark:bg-gray-900/50"
                            >
                                <MapPin
                                    className="h-8 w-8 text-gray-300 dark:text-gray-700"
                                    aria-hidden="true"
                                />
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Click a hostel pin
                                </p>
                                <p className="px-4 text-xs text-gray-400 dark:text-gray-600">
                                    Select a hostel on the map to explore nearby
                                    landmarks and calculate walking distances.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Nearby landmarks panel */}
                    <AnimatePresence>
                        {selectedHostel && (
                            <motion.div
                                key="nearby"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                            >
                                <NearbyLandmarksPanel
                                    hostelId={selectedHostel.id}
                                    onLandmarkSelect={handleLandmarkSelect}
                                    selectedLandmarkId={selectedLandmark?.id}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
