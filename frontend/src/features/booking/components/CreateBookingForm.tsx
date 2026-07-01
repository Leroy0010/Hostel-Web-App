import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, CalendarCheck } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';


import { useCreateBooking } from '../hooks/booking.hooks';
import {
    createBookingSchema,
    type CreateBookingFormValues,
    type CreateBookingPayload,
    type Semester,
} from '../types/booking.types';
import type { ApiError } from '@/types/api';
import { FieldError } from '@/components/ui/FieldError';
import { transition } from '@/features/auth/utils/transition';
import type { AvailablePeriodDto } from '@/features/hostel/types/hostel.types';
import { useMemo } from 'react';
import { Combobox } from '@/components/ui/my-combobox';

// =============================================================================
// Types
// =============================================================================

interface CreateBookingFormProps {
    /** UUID of the room being booked — pre-filled from the room detail page. */
    roomId: string;
    /**
     * Called after the booking is successfully created.
     * @param bookingId - UUID of the new booking, for navigation to detail page.
     */
    onSuccess?: (bookingId: string) => void;
    /** Called when the user clicks Cancel. */
    onCancel?: () => void;
    availablePeriods: AvailablePeriodDto[];
}

// =============================================================================
// Animation variants
// =============================================================================

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
 * Student booking request form.
 *
 * Fields:
 *  - Academic year — populated with current and next year options.
 *  - Semester — FIRST / SECOND / FULL.
 *
 * The roomId is a hidden field pre-filled from the props (not editable by the user).
 * The academic year defaults to the current calculated academic year.
 *
 * Flow:
 *  1. Student selects academic year and semester.
 *  2. On submit, {@code POST /api/bookings} is called.
 *  3. {@link onSuccess} is called with the new booking ID for navigation.
 *
 * Server-side validation errors are mapped back onto form fields.
 *
 * Designed to render inside a {@code <Dialog>} on the room detail page.
 */
export function CreateBookingForm({
    roomId,
    onSuccess,
    onCancel,
    availablePeriods,
}: CreateBookingFormProps) {
    const { mutate, isPending } = useCreateBooking();
    const shouldReduceMotion = useReducedMotion();

    const {
        handleSubmit,
        setValue,
        setError,
        control,
        formState: { errors },
    } = useForm<CreateBookingFormValues>({
        resolver: zodResolver(createBookingSchema),
        defaultValues: {
            roomId,
            academicYear: undefined,
            semester: undefined,
        },
    });

    const periodOptions = useMemo(
        () =>
            availablePeriods.map((period) => ({
                value: period.academicYear + '|' + period.semester,
                label: period.academicYear + ' | ' + period.semester,
            })),
        [availablePeriods]
    );

    const onSubmit = (data: CreateBookingFormValues) => {
        const payload: CreateBookingPayload = {
            roomId: data.roomId,
            academicYear: data.academicYear,
            semester: data.semester,
        };

        mutate(payload, {
            onSuccess: (booking) => {
                onSuccess?.(booking.id);
            },
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof CreateBookingFormValues, {
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
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                noValidate
            >
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="cb-period"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Period <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                        control={control}
                        name="selectedPeriodKey"
                        render={({ field: { value, onChange } }) => (
                            <Combobox
                            placeholder='Select period'
                                value={value}
                                onValueChange={(val) => {
                                    onChange(val);
                                    const periodParts = (val as string).split(
                                        '|'
                                    );
                                    setValue('academicYear', periodParts[0]);
                                    setValue(
                                        'semester',
                                        periodParts[1] as Semester
                                    );
                                }}
                                options={periodOptions}
                            />
                        )}
                    />
                    {errors.academicYear && (
                        <FieldError message={errors.academicYear.message!} />
                    )}
                </motion.div>
                
                {/* <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="cb-year"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Academic year <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        defaultValue={currentAcademicYear()}
                        onValueChange={(val) =>
                            setValue('academicYear', val, {
                                shouldValidate: true,
                            })
                        }
                    >
                        <SelectTrigger id="cb-year" className={SELECT_CLS}>
                            <SelectValue placeholder="Select year…" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            {yearOptions.map((year) => (
                                <SelectItem key={year} value={year}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.academicYear && (
                        <FieldError message={errors.academicYear.message!} />
                    )}
                </motion.div>

                
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="cb-semester"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Semester <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        onValueChange={(val) =>
                            setValue(
                                'semester',
                                val as CreateBookingFormValues['semester'],
                                { shouldValidate: true }
                            )
                        }
                    >
                        <SelectTrigger id="cb-semester" className={SELECT_CLS}>
                            <SelectValue placeholder="Select semester…" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <SelectItem value="FIRST">1st Semester</SelectItem>
                            <SelectItem value="SECOND">2nd Semester</SelectItem>
                            <SelectItem value="FULL">Full Year</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.semester && (
                        <FieldError message={errors.semester.message!} />
                    )}
                </motion.div> */}

                {/* Notice */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/50 dark:bg-blue-950/30"
                >
                    <CalendarCheck
                        className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
                        aria-hidden="true"
                    />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        Your booking request will be sent to the hostel manager
                        for review. Once approved, you will have a deadline to
                        submit your payment reference.
                    </p>
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
                        Submit booking request
                    </Button>
                </motion.div>
            </form>
        </motion.div>
    );
}
