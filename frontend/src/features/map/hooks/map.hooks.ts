import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mapKeys } from '../types/map.keys';
import {
    calculateDistance,
    createLandmark,
    deleteLandmark,
    fetchAllLandmarks,
    fetchLandmarkById,
    fetchNearbyLandmarks,
    updateLandmark,
} from '../api/map.api';
import type {
    CreateLandmarkPayload,
    LandmarkCategory,
    LandmarkDto,
    UpdateLandmarkPayload,
} from '../types/map.types';
import type { ApiError } from '@/types/api';

// =============================================================================
// Queries
// =============================================================================

/**
 * All landmarks for the initial map load.
 * Optionally filtered by category — drives the map category filter chips.
 * Long stale time: landmark data is stable and rarely changes.
 */
export function useAllLandmarks(category?: LandmarkCategory, search?: string) {
    return useQuery({
        queryKey: mapKeys.landmarkList(category, search),
        queryFn: () => fetchAllLandmarks(category, search),
        staleTime: 10 * 60 * 1000, // 10 minutes — landmarks change rarely
    });
}

/** Single landmark detail — used when a user taps a map pin. */
export function useLandmarkDetail(id: string | null | undefined) {
    return useQuery({
        queryKey: mapKeys.landmarkDetail(id ?? ''),
        queryFn: () => fetchLandmarkById(id!),
        enabled: Boolean(id),
        staleTime: 10 * 60 * 1000,
    });
}

/**
 * Distance between a specific hostel and landmark.
 * Disabled until both IDs are provided — prevents unnecessary network calls.
 * Used in the interactive distance calculator on the campus map page.
 */
export function useDistance(
    hostelId: string | null | undefined,
    landmarkId: string | null | undefined
) {
    return useQuery({
        queryKey: mapKeys.distance(hostelId ?? '', landmarkId ?? ''),
        queryFn: () => calculateDistance(hostelId!, landmarkId!),
        enabled: Boolean(hostelId) && Boolean(landmarkId),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Nearby landmarks within a radius of a hostel.
 * Used on the hostel detail page — the "Nearby" panel.
 * Default radius: 1000 m (1 km).
 *
 * @param hostelId     - Hostel UUID. Disabled if null.
 * @param radiusMetres - Search radius in metres. Defaults to 1000.
 */
export function useNearbyLandmarks(
    hostelId: string | null | undefined,
    radiusMetres = 1000
) {
    return useQuery({
        queryKey: mapKeys.nearby(hostelId ?? '', radiusMetres),
        queryFn: () => fetchNearbyLandmarks(hostelId!, radiusMetres),
        enabled: Boolean(hostelId),
        staleTime: 5 * 60 * 1000,
    });
}

// =============================================================================
// Admin mutations
// =============================================================================

export function useCreateLandmark() {
    const queryClient = useQueryClient();
    return useMutation<LandmarkDto, ApiError, CreateLandmarkPayload>({
        mutationFn: createLandmark,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mapKeys.landmarks() });
            toast.success('Landmark created.');
        },
    });
}

export function useUpdateLandmark(id: string) {
    const queryClient = useQueryClient();
    return useMutation<LandmarkDto, ApiError, UpdateLandmarkPayload>({
        mutationFn: (payload) => updateLandmark(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mapKeys.landmarks() });
            toast.success('Landmark updated.');
        },
    });
}

export function useDeleteLandmark() {
    const queryClient = useQueryClient();
    return useMutation<void, ApiError, string>({
        mutationFn: (landmarkId) => deleteLandmark(landmarkId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mapKeys.landmarks() });
            toast.success('Landmark deleted.');
        },
    });
}
