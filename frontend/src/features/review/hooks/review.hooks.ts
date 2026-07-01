import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reviewKeys } from '../types/review.keys';
import {
    createReview,
    deleteReview,
    fetchHostelRating,
    fetchHostelReviews,
    fetchMyReviews,
    fetchReviewById,
    updateReview,
} from '../api/review.api';
import type {
    CreateReviewPayload,
    ReviewDto,
    UpdateReviewPayload,
} from '../types/review.types';
import type { ApiError } from '@/types/api';
import type { PaginationParams } from '@/types/pagination';

// =============================================================================
// Queries
// =============================================================================

/** Student: own review history. */
export function useMyReviews(params: { page?: number; size?: number } = {}) {
    return useQuery({
        queryKey: reviewKeys.myReviews(params),
        queryFn: () => fetchMyReviews(params),
        staleTime: 2 * 60 * 1000,
        placeholderData: (prev) => prev,
    });
}

/** Single review detail. */
export function useReviewDetail(id: string | null | undefined) {
    return useQuery({
        queryKey: reviewKeys.detail(id ?? ''),
        queryFn: () => fetchReviewById(id!),
        enabled: Boolean(id),
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Paginated review feed for a hostel.
 * Used on the hostel detail page alongside {@link useHostelRating}.
 */
export function useHostelReviews(
    hostelId: string | null | undefined,
    params: PaginationParams = {}
) {
    return useQuery({
        queryKey: reviewKeys.hostelFeed(hostelId ?? '', params),
        queryFn: () => fetchHostelReviews(hostelId!, params),
        enabled: Boolean(hostelId),
        staleTime: 2 * 60 * 1000,
        placeholderData: (prev) => prev,
    });
}

/**
 * Aggregate rating card (average + count) for a hostel.
 * Displayed prominently on the hostel detail and listing pages.
 */
export function useHostelRating(hostelId: string | null | undefined) {
    return useQuery({
        queryKey: reviewKeys.hostelRating(hostelId ?? ''),
        queryFn: () => fetchHostelRating(hostelId!),
        enabled: Boolean(hostelId),
        staleTime: 3 * 60 * 1000,
    });
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Student: submits a new review.
 *
 * On success invalidates the hostel's review feed, aggregate rating, and
 * the student's own review list so all views stay consistent.
 */
export function useCreateReview() {
    const queryClient = useQueryClient();

    return useMutation<ReviewDto, ApiError, CreateReviewPayload>({
        mutationFn: createReview,
        onSuccess: (review) => {
            queryClient.invalidateQueries({
                queryKey: reviewKeys.hostelFeed(review.hostelId),
            });
            queryClient.invalidateQueries({
                queryKey: reviewKeys.hostelRating(review.hostelId),
            });
            queryClient.invalidateQueries({ queryKey: reviewKeys.myReviews() });
            toast.success('Review submitted. Thank you for your feedback!');
        },
        onError: (err) => {
            if (err.code !== 'VALIDATION_FAILED') {
                toast.error(err.message ?? 'Failed to create hostel.');
            }
        },
    });
}

/**
 * Student: updates their own review.
 *
 * @param reviewId  - UUID of the review being updated.
 * @param hostelId  - UUID of the hostel (for feed + rating invalidation).
 */
export function useUpdateReview(reviewId: string, hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<ReviewDto, ApiError, UpdateReviewPayload>({
        mutationFn: (payload) => updateReview(reviewId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: reviewKeys.detail(reviewId),
            });
            queryClient.invalidateQueries({
                queryKey: reviewKeys.hostelFeed(hostelId),
            });
            queryClient.invalidateQueries({
                queryKey: reviewKeys.hostelRating(hostelId),
            });
            queryClient.invalidateQueries({ queryKey: reviewKeys.myReviews() });
            toast.success('Review updated.');
        },
        onError: (err) => {
            if (err.code !== 'VALIDATION_FAILED') {
                toast.error(err.message ?? 'Failed to create hostel.');
            }
        },
    });
}

/**
 * Student/Admin: deletes a review.
 *
 * @param reviewId - UUID of the review.
 * @param hostelId - UUID of the hostel (for feed + rating invalidation).
 */
export function useDeleteReview(reviewId: string, hostelId: string) {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, void>({
        mutationFn: () => deleteReview(reviewId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: reviewKeys.detail(reviewId),
            });
            queryClient.invalidateQueries({
                queryKey: reviewKeys.hostelFeed(hostelId),
            });
            queryClient.invalidateQueries({
                queryKey: reviewKeys.hostelRating(hostelId),
            });
            queryClient.invalidateQueries({ queryKey: reviewKeys.myReviews() });
            toast.success('Review deleted.');
        },
        onError: (err) => {
            if (err.code !== 'VALIDATION_FAILED') {
                toast.error(err.message ?? 'Failed to create hostel.');
            }
        },
    });
}
