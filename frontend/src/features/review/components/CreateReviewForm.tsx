import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/ui/FieldError';
import { StarInput } from './StarRating';

import { useCreateReview } from '../hooks/review.hooks';
import {
    createReviewSchema,
    type CreateReviewFormValues,
    type CreateReviewPayload,
} from '../types/review.types';
import { transition } from '@/features/auth/utils/transition';
import type { ApiError } from '@/types/api';

// =============================================================================
// Types
// =============================================================================

interface CreateReviewFormProps {
    /** UUID of the hostel being reviewed. Pre-filled. */
    hostelId: string;
    /**
     * The qualifying booking ID (CHECKED_IN or CHECKED_OUT).
     * Pre-filled from the booking the student navigated from.
     * The backend validates this server-side.
     */
    bookingId: string;
    /** Called with the new review ID after successful submission. */
    onSuccess?: () => void;
    onCancel?: () => void;
}

// =============================================================================
// Animation
// =============================================================================

const rowVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition },
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition },
};

const INPUT_CLS =
    'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600';

// =============================================================================
// Component
// =============================================================================

/**
 * Student review creation form.
 *
 * Proof-of-stay gating (HCI principle — prevent errors at input):
 * The {@code bookingId} is pre-filled from context so the student never needs
 * to manually enter it. The backend validates ownership server-side.
 *
 * The interactive {@link StarInput} gives immediate visual feedback on the
 * selected rating, including a text label (Poor → Excellent) so students
 * without colour vision have a semantic alternative.
 *
 * Used on the {@link BookingDetailPage} via a "Write a Review" CTA shown
 * after the booking reaches CHECKED_IN / CHECKED_OUT status.
 */
export function CreateReviewForm({
    hostelId,
    bookingId,
    onSuccess,
    onCancel,
}: CreateReviewFormProps) {
    const { mutate, isPending } = useCreateReview();

    const {
        control,
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<CreateReviewFormValues>({
        resolver: zodResolver(createReviewSchema),
        defaultValues: {
            hostelId,
            bookingId,
            rating: 0,
            comment: '',
        },
    });

    const onSubmit = (data: CreateReviewFormValues) => {
        const payload: CreateReviewPayload = {
            hostelId: data.hostelId,
            bookingId: data.bookingId,
            rating: data.rating,
            ...(data.comment?.trim() && { comment: data.comment.trim() }),
        };

        mutate(payload, {
            onSuccess: () => onSuccess?.(),
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof CreateReviewFormValues, {
                            type: 'server',
                            message: messages[0],
                        });
                    });
                }
            },
        });
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                noValidate
            >
                {/* Star rating */}
                <motion.div variants={rowVariants} className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Your rating <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                        control={control}
                        name="rating"
                        render={({ field }) => (
                            <StarInput
                                value={field.value ?? 0}
                                onChange={field.onChange}
                                disabled={isPending}
                            />
                        )}
                    />
                    {errors.rating && (
                        <FieldError message={errors.rating.message!} />
                    )}
                </motion.div>

                {/* Comment */}
                <motion.div variants={rowVariants} className="space-y-1.5">
                    <Label
                        htmlFor="cr-comment"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Comment{' '}
                        <span className="text-gray-400 dark:text-gray-500">
                            (optional)
                        </span>
                    </Label>
                    <Textarea
                        id="cr-comment"
                        rows={4}
                        placeholder="Share details about your stay — cleanliness, facilities, management responsiveness…"
                        className={`${INPUT_CLS} resize-none`}
                        {...register('comment')}
                    />
                    {errors.comment && (
                        <FieldError message={errors.comment.message!} />
                    )}
                </motion.div>

                {/* Actions */}
                <motion.div
                    variants={rowVariants}
                    className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"
                >
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isPending}
                            className="border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="bg-gray-900 font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                    >
                        {isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Submit review
                    </Button>
                </motion.div>
            </form>
        </motion.div>
    );
}
