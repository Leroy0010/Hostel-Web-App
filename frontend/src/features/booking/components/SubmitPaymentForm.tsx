import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import { useSubmitPayment } from '../hooks/booking.hooks';
import {
    submitPaymentSchema,
    type SubmitPaymentFormValues,
    type SubmitPaymentPayload,
} from '../types/booking.types';
import type { ApiError } from '@/types/api';
import { FieldError } from '@/components/ui/FieldError';
import { transition } from '@/features/auth/utils/transition';

// =============================================================================
// Types
// =============================================================================

interface SubmitPaymentFormProps {
    /** UUID of the booking to submit payment for. Must be in APPROVED status. */
    bookingId: string;
    /** Called after the payment reference is successfully submitted. */
    onSuccess?: () => void;
    /** Called when the user clicks Cancel. */
    onCancel?: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const INPUT_CLS =
    'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600';

const formVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.25, staggerChildren: 0.06 },
    },
};

const rowVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
        opacity: 1,
        y: 0,
        transition,
    },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Student form for submitting an external payment reference.
 *
 * Design notes:
 *  - No payment processing happens here. The student submits a reference from
 *    an external transaction (e.g. Mobile Money, bank transfer) they've already
 *    completed.
 *  - The manager verifies the reference offline before allowing check-in.
 *  - The declared amount is informational — the manager is the source of truth.
 *
 * Used on the {@link BookingDetailPage} for APPROVED bookings.
 */
export function SubmitPaymentForm({
    bookingId,
    onSuccess,
    onCancel,
}: SubmitPaymentFormProps) {
    const { mutate, isPending } = useSubmitPayment(bookingId);
    const shouldReduceMotion = useReducedMotion();

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<SubmitPaymentFormValues>({
        resolver: zodResolver(submitPaymentSchema),
        defaultValues: { paymentRef: '', amountPaid: '' },
    });

    const onSubmit = (data: SubmitPaymentFormValues) => {
        const payload: SubmitPaymentPayload = {
            paymentRef: data.paymentRef,
            amountPaid: data.amountPaid,
        };

        mutate(payload, {
            onSuccess: () => onSuccess?.(),
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof SubmitPaymentFormValues, {
                            type: 'server',
                            message: messages[0],
                        });
                    });
                }
            },
        });
    };

    const motionProps = shouldReduceMotion
        ? {}
        : { variants: formVariants, initial: 'hidden', animate: 'visible' };

    return (
        <motion.div {...motionProps}>
            {/* Payment instructions notice */}
            <motion.div
                variants={shouldReduceMotion ? {} : rowVariants}
                className="mb-5 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800/50 dark:bg-green-950/30"
            >
                <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400"
                    aria-hidden="true"
                />
                <p className="text-xs text-green-700 dark:text-green-300">
                    Make your payment via Mobile Money or bank transfer to the
                    hostel's account, then enter the transaction reference
                    number below. The manager will verify it before allowing
                    check-in.
                </p>
            </motion.div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                noValidate
            >
                {/* Payment reference */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="sp-ref"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Transaction reference{' '}
                        <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="sp-ref"
                        placeholder="e.g. MoMo-20250115-XXXXXXXX"
                        className={INPUT_CLS}
                        {...register('paymentRef')}
                    />
                    {errors.paymentRef && (
                        <FieldError message={errors.paymentRef.message!} />
                    )}
                </motion.div>

                {/* Amount paid */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="sp-amount"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Amount paid <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
                            ₵
                        </span>
                        <Input
                            id="sp-amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            className={`pl-7 ${INPUT_CLS}`}
                            {...register('amountPaid')}
                        />
                    </div>
                    {errors.amountPaid && (
                        <FieldError message={errors.amountPaid.message!} />
                    )}
                </motion.div>

                {/* Actions */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
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
                        Submit payment reference
                    </Button>
                </motion.div>
            </form>
        </motion.div>
    );
}
