import { apiClient } from '@/lib/axios';
import type {
    CreateLandmarkPayload,
    DistanceDto,
    LandmarkCategory,
    LandmarkDto,
    NearbyLandmarkDto,
    UpdateLandmarkPayload,
} from '../types/map.types';

export function fetchAllLandmarks(
    category?: LandmarkCategory,
    search?: string
): Promise<LandmarkDto[]> {
    return apiClient.get('/landmarks', {
        params: { category, search },
    });
}

export function fetchLandmarkById(id: string): Promise<LandmarkDto> {
    return apiClient.get(`/landmarks/${id}`);
}

export function calculateDistance(
    hostelId: string,
    landmarkId: string
): Promise<DistanceDto> {
    return apiClient.get('/landmarks/distance', {
        params: { hostelId, landmarkId },
    });
}

export function fetchNearbyLandmarks(
    hostelId: string,
    radiusMetres = 1000
): Promise<NearbyLandmarkDto[]> {
    return apiClient.get(`/hostels/${hostelId}/landmarks/nearby`, {
        params: { radiusMetres },
    });
}

export function createLandmark(
    payload: CreateLandmarkPayload
): Promise<LandmarkDto> {
    return apiClient.post('/admin/landmarks', payload);
}

export function updateLandmark(
    id: string,
    payload: UpdateLandmarkPayload
): Promise<LandmarkDto> {
    return apiClient.put(`/admin/landmarks/${id}`, payload);
}

export function deleteLandmark(id: string): Promise<void> {
    return apiClient.delete(`/admin/landmarks/${id}`);
}
