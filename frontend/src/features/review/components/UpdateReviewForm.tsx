import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/ui/FieldError';
import { StarInput } from './StarRating';

import { useUpdateReview } from '../hooks/review.hooks';
import {
    updateReviewSchema,
    type UpdateReviewFormValues,
    type UpdateReviewPayload,
} from '../types/review.types';
import { transition } from '@/features/auth/utils/transition';
import type { ApiError } from '@/types/api';

// =============================================================================
// Types
// =============================================================================

interface UpdateReviewFormProps {
    /** UUID of the review being updated. */
    reviewId: string;
    /** UUID of the hostel (required by the hook for cache invalidation). */
    hostelId: string;
    /** Current rating value to pre-populate the form. */
    initialRating: number;
    /** Current comment text to pre-populate the form. */
    initialComment: string | null;
    /** Called after successful modification. */
    onSuccess?: () => void;
    /** Called when the user cancels the update action. */
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
 * Student review modification form.
 * * Pre-populates fields with existing review context to maintain continuity.
 * Includes interactive rating adjustments and textual feedback alternatives
 * for seamless UX. Meant for usage within inline sheets, modals, or dialog overlays.
 */
export function UpdateReviewForm({
    reviewId,
    hostelId,
    initialRating,
    initialComment,
    onSuccess,
    onCancel,
}: UpdateReviewFormProps) {
    const { mutate, isPending } = useUpdateReview(reviewId, hostelId);

    const {
        control,
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<UpdateReviewFormValues>({
        resolver: zodResolver(updateReviewSchema),
        defaultValues: {
            rating: initialRating,
            comment: initialComment ?? '',
        },
    });

    const onSubmit = (data: UpdateReviewFormValues) => {
        const payload: UpdateReviewPayload = {
            rating: data.rating,
            comment: data.comment?.trim() || '',
        };

        mutate(payload, {
            onSuccess: () => onSuccess?.(),
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof UpdateReviewFormValues, {
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
                        Update your rating{' '}
                        <span className="text-red-500">*</span>
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
                        htmlFor="ur-comment"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Comment{' '}
                        <span className="text-gray-400 dark:text-gray-500">
                            (optional)
                        </span>
                    </Label>
                    <Textarea
                        id="ur-comment"
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
                        Save changes
                    </Button>
                </motion.div>
            </form>
        </motion.div>
    );
}
