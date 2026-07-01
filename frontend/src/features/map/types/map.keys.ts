import type { LandmarkCategory } from '../types/map.types';

export const mapKeys = {
    all: ['map'] as const,
    landmarks: () => [...mapKeys.all, 'landmarks'] as const,
    landmarkList: (category?: LandmarkCategory, search?: string) =>
        [...mapKeys.landmarks(), 'list', category ?? 'ALL', search] as const,
    landmarkDetail: (id: string) =>
        [...mapKeys.landmarks(), 'detail', id] as const,
    distance: (hostelId: string, landmarkId: string) =>
        [...mapKeys.all, 'distance', hostelId, landmarkId] as const,
    nearby: (hostelId: string, radiusMetres?: number) =>
        [...mapKeys.all, 'nearby', hostelId, radiusMetres ?? 1000] as const,
} as const;
