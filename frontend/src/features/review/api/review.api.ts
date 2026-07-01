import { apiClient } from '@/lib/axios';
import type {
    CreateReviewPayload,
    HostelRatingDto,
    ReviewDto,
    ReviewSummaryDto,
    UpdateReviewPayload,
} from '../types/review.types';
import type { PageResponse, PaginationParams } from '@/types/pagination';

/**
 * Submit a new review (STUDENT only).
 * The bookingId validates the student genuinely stayed at the hostel.
 *
 * Maps to: {@code POST /api/reviews}
 */
export function createReview(payload: CreateReviewPayload): Promise<ReviewDto> {
    return apiClient.post('/reviews', payload);
}

/**
 * Fetches the authenticated student's own reviews.
 * Maps to: {@code GET /api/reviews/my}
 */
export function fetchMyReviews(
    params: PaginationParams = {}
): Promise<PageResponse<ReviewSummaryDto>> {
    return apiClient.get('/reviews/my', {
        params: {
            page: params.page ?? 0,
            size: params.size ?? 10,
            sort: 'createdAt,desc',
        },
    });
}

/**
 * Fetches a single review by ID (any authenticated user).
 * Maps to: {@code GET /api/reviews/{id}}
 */
export function fetchReviewById(id: string): Promise<ReviewDto> {
    return apiClient.get(`/reviews/${id}`);
}

/**
 * Updates rating and/or comment (author only).
 * Maps to: {@code PUT /api/reviews/{id}}
 */
export function updateReview(
    id: string,
    payload: UpdateReviewPayload
): Promise<ReviewDto> {
    return apiClient.put(`/reviews/${id}`, payload);
}

/**
 * Deletes a review (author or ADMIN).
 * Maps to: {@code DELETE /api/reviews/{id}}
 */
export function deleteReview(id: string): Promise<void> {
    return apiClient.delete(`/reviews/${id}`);
}

/**
 * Paginated review feed for a hostel.
 * Maps to: {@code GET /api/hostels/{hostelId}/reviews}
 */
export function fetchHostelReviews(
    hostelId: string,
    params: { page?: number; size?: number } = {}
): Promise<PageResponse<ReviewSummaryDto>> {
    return apiClient.get(`/hostels/${hostelId}/reviews`, {
        params: {
            page: params.page ?? 0,
            size: params.size ?? 10,
            sort: 'createdAt,desc',
        },
    });
}

/**
 * Aggregate rating card for a hostel.
 * Maps to: {@code GET /api/hostels/{hostelId}/reviews/rating}
 */
export function fetchHostelRating(hostelId: string): Promise<HostelRatingDto> {
    return apiClient.get(`/hostels/${hostelId}/reviews/rating`);
}
