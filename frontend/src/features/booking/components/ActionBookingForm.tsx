import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { useActionBooking } from '../hooks/booking.hooks';
import {
    actionBookingSchema,
    type ActionBookingFormValues,
    type ActionBookingPayload,
} from '../types/booking.types';
import type { ApiError } from '@/types/api';
import { FieldError } from '@/components/ui/FieldError';
import { transition } from '@/features/auth/utils/transition';

// =============================================================================
// Types
// =============================================================================

interface ActionBookingFormProps {
    /** UUID of the booking being actioned. */
    bookingId: string;
    /** UUID of the room — required for cache invalidation after mutation. */
    roomId: string;
    /** Called after a successful approve or reject action. */
    onSuccess?: () => void;
    /** Called when the user clicks Cancel. */
    onCancel?: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const INPUT_CLS =
    'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600';

const DEFAULT_GRACE_HOURS = 48;

const rowVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: {
        opacity: 1,
        y: 0,
        transition,
    },
    exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Manager form for approving or rejecting a PENDING booking.
 *
 * The form has two mutually exclusive states controlled by the decision toggle:
 *
 *  **Approve path:**
 *  - Optional grace period hours input (defaults to 48 h).
 *  - Range: 1-720 hours.
 *  - Allows managers to set tight windows (e.g. 12 h during peak) or lenient
 *    ones (e.g. 168 h off-season) before the booking auto-expires.
 *
 *  **Reject path:**
 *  - Required rejection reason textarea (mapped to {@code rejectedReason}).
 *  - The backend validates that this field is non-blank on rejection.
 *
 * Framer Motion {@code AnimatePresence} handles the smooth transition between
 * the two conditional field sections.
 *
 * Server-side {@code VALIDATION_FAILED} errors are mapped back onto fields.
 */
export function ActionBookingForm({
    bookingId,
    roomId,
    onSuccess,
    onCancel,
}: ActionBookingFormProps) {
    const { mutate, isPending } = useActionBooking(bookingId, roomId);
    const shouldReduceMotion = useReducedMotion();

    // Local toggle driving the approve/reject field sections
    const [decision, setDecision] = useState<'approve' | 'reject'>('approve');

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<ActionBookingFormValues>({
        resolver: zodResolver(actionBookingSchema),
        defaultValues: {
            approved: true,
            gracePeriodHours: DEFAULT_GRACE_HOURS,
            rejectedReason: '',
        },
    });

    // Keep form value in sync with the visual toggle
    const handleDecisionChange = (newDecision: 'approve' | 'reject') => {
        setDecision(newDecision);
        const isApprove = newDecision === 'approve';
        setValue('approved', isApprove, { shouldValidate: false });
        // Clear the field that is no longer relevant
        if (isApprove) {
            clearErrors('rejectedReason');
        } else {
            clearErrors('gracePeriodHours');
        }
    };

    const onSubmit = (data: ActionBookingFormValues) => {
        const payload: ActionBookingPayload = {
            approved: data.approved,
            ...(data.approved === false && data.rejectedReason
                ? { rejectedReason: data.rejectedReason }
                : {}),
            ...(data.approved === true && data.gracePeriodHours
                ? { gracePeriodHours: data.gracePeriodHours }
                : {}),
        };

        mutate(payload, {
            onSuccess: () => onSuccess?.(),
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof ActionBookingFormValues, {
                            type: 'server',
                            message: messages[0],
                        });
                    });
                }
            },
        });
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
        >
            {/* ── Decision toggle ──────────────────────────────────────── */}
            <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Decision <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                    {/* Approve button */}
                    <button
                        type="button"
                        onClick={() => handleDecisionChange('approve')}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none ${
                            decision === 'approve'
                                ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700/50 dark:bg-green-950/40 dark:text-green-300'
                                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400 dark:hover:bg-gray-900'
                        }`}
                        aria-pressed={decision === 'approve'}
                    >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Approve
                    </button>

                    {/* Reject button */}
                    <button
                        type="button"
                        onClick={() => handleDecisionChange('reject')}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none ${
                            decision === 'reject'
                                ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700/50 dark:bg-red-950/40 dark:text-red-300'
                                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400 dark:hover:bg-gray-900'
                        }`}
                        aria-pressed={decision === 'reject'}
                    >
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        Reject
                    </button>
                </div>
            </div>

            {/* ── Conditional fields ───────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {/* Approve: grace period */}
                {decision === 'approve' && (
                    <motion.div
                        key="approve-fields"
                        variants={shouldReduceMotion ? undefined : rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-1.5"
                    >
                        <Label
                            htmlFor="ab-grace"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Payment grace period{' '}
                            <span className="font-normal text-gray-400 dark:text-gray-500">
                                (hours)
                            </span>
                        </Label>
                        <Input
                            id="ab-grace"
                            type="number"
                            min={1}
                            max={720}
                            placeholder={String(DEFAULT_GRACE_HOURS)}
                            className={INPUT_CLS}
                            {...register('gracePeriodHours', {
                                valueAsNumber: true,
                            })}
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-600">
                            Hours the student has to submit their payment
                            reference. Default: 48 h. Range: 1–720 h.
                        </p>
                        {errors.gracePeriodHours && (
                            <FieldError
                                message={errors.gracePeriodHours.message!}
                            />
                        )}
                    </motion.div>
                )}

                {/* Reject: reason */}
                {decision === 'reject' && (
                    <motion.div
                        key="reject-fields"
                        variants={shouldReduceMotion ? undefined : rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-1.5"
                    >
                        <Label
                            htmlFor="ab-reason"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Rejection reason{' '}
                            <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="ab-reason"
                            rows={3}
                            placeholder="Explain why this booking is being rejected…"
                            className={`${INPUT_CLS} resize-none`}
                            {...register('rejectedReason')}
                        />
                        {errors.rejectedReason && (
                            <FieldError
                                message={errors.rejectedReason.message!}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Actions ─────────────────────────────────────────────── */}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
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
                    className={
                        decision === 'approve'
                            ? 'bg-green-600 font-medium text-white hover:bg-green-700 disabled:opacity-50'
                            : 'bg-red-600 font-medium text-white hover:bg-red-700 disabled:opacity-50'
                    }
                >
                    {isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {decision === 'approve'
                        ? 'Approve booking'
                        : 'Reject booking'}
                </Button>
            </div>
        </form>
    );
}
