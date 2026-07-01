import { z } from 'zod';

// =============================================================================
// Response shapes
// =============================================================================

/**
 * Minimal author info embedded in review responses.
 * Mirrors {@code ReviewDto.AuthorSummary}.
 */
export interface ReviewAuthorSummary {
    id: string;
    firstName: string;
    lastName: string;
}

/**
 * Full review detail.
 * Mirrors {@code ReviewDto}.
 */
export interface ReviewDto {
    id: string;
    author: ReviewAuthorSummary;
    hostelId: string;
    hostelName: string;
    bookingId: string;
    rating: number;
    comment: string | null;
    createdAt: string;
}

/**
 * Lightweight review summary for paginated feeds.
 * Mirrors {@code ReviewSummaryDto}.
 */
export interface ReviewSummaryDto {
    id: string;
    authorId: string;
    hostelId: string;
    authorName: string;
    rating: number;
    comment: string | null;
    createdAt: string;
}

/**
 * Aggregate rating card for a hostel.
 * Mirrors {@code HostelRatingDto}.
 */
export interface HostelRatingDto {
    hostelId: string;
    /** null when no reviews have been submitted yet */
    averageRating: number | null;
    totalReviews: number;
}



// =============================================================================
// Zod schemas
// =============================================================================

/**
 * Student review creation schema.
 * Maps to {@code POST /api/reviews} → {@code CreateReviewRequest}.
 *
 * The {@code bookingId} is the proof-of-stay anchor validated server-side.
 */
export const createReviewSchema = z.object({
    hostelId: z.string().uuid('Invalid hostel ID'),
    bookingId: z.string().uuid('A qualifying booking is required'),
    rating: z
        .number({ error: 'Rating is required' })
        .int()
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating must not exceed 5'),
    comment: z
        .string()
        .max(2000, 'Comment must not exceed 2000 characters')
        .optional(),
});

export type CreateReviewFormValues = z.infer<typeof createReviewSchema>;

/**
 * Review update schema — patch semantics, all fields optional.
 * Maps to {@code PUT /api/reviews/{id}} → {@code UpdateReviewRequest}.
 */
export const updateReviewSchema = z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(2000).optional(),
});

export type UpdateReviewFormValues = z.infer<typeof updateReviewSchema>;

// =============================================================================
// API payload types
// =============================================================================

/** Sent to {@code POST /api/reviews}. */
export interface CreateReviewPayload {
    hostelId: string;
    bookingId: string;
    rating: number;
    comment?: string;
}

/** Sent to {@code PUT /api/reviews/{id}}. */
export interface UpdateReviewPayload {
    rating?: number;
    comment?: string;
}
