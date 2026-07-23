/* eslint-disable react-hooks/incompatible-library */

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/ui/FieldError';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/my-combobox'; // Ensure this path matches your structure

import { useCreateComplaint } from '../hooks/complaint.hooks';

import { useGetStudentActiveHostels } from '@/features/hostel/hooks/hostel.hooks';
import { useGetStudentActiveRoomsByHostelId } from '@/features/room/hooks/room.hooks';

import {
    createComplaintSchema,
    type CreateComplaintFormValues,
    type CreateComplaintPayload,
} from '../types/complaint.types';
import { transition } from '@/features/auth/utils/transition';
import type { ApiError } from '@/types/api';
import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

interface CreateComplaintFormProps {
    /** Pre-filled hostel UUID — the student is raising a complaint for this hostel. */
    hostelId?: string; // Made optional so users can select if not pre-filled
    /**
     * Optional pre-filled room UUID.
     * Populated when navigating from a room detail page.
     * null = hostel-wide complaint.
     */
    roomId?: string | null;
    /** Called after successful submission. */
    onSuccess?: (complaintId: string) => void;
    onCancel?: () => void;
}

// =============================================================================
// Animation
// =============================================================================

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition },
};

const rowVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition },
};

const SELECT_CLS =
    'border-gray-200 bg-white text-gray-900 focus:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-600';

const INPUT_CLS =
    'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600';

// =============================================================================
// Component
// =============================================================================

export function CreateComplaintForm({
    hostelId = '',
    roomId,
    onSuccess,
    onCancel,
}: CreateComplaintFormProps) {
    const { mutate, isPending } = useCreateComplaint();

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        watch,
        control,
        reset,
        formState: { errors },
    } = useForm<CreateComplaintFormValues>({
        resolver: zodResolver(createComplaintSchema),
        defaultValues: {
            hostelId,
            roomId: roomId ?? '',
            title: '',
            description: '',
        },
    });

    // Watch values to drive dependent queries & controlled components
    const currentHostelId = watch('hostelId');

    // Fetch data for comboboxes
    const { data: hostels, isLoading: isLoadingHostels } =
        useGetStudentActiveHostels();
    const { data: rooms, isLoading: isLoadingRooms } =
        useGetStudentActiveRoomsByHostelId(currentHostelId);

    // Map queries to ComboboxOption format
    const hostelOptions = useMemo(() => {
        return hostels?.map((h) => ({ label: h.name, value: h.id })) || [];
    }, [hostels]);

    const roomOptions = useMemo(() => {
        return rooms?.map((r) => ({ label: r.roomNumber, value: r.id })) || [];
    }, [rooms]);

    const onSubmit = (data: CreateComplaintFormValues) => {
        const payload: CreateComplaintPayload = {
            hostelId: data.hostelId,
            title: data.title,
            description: data.description,
            category: data.category,
            ...(data.roomId && { roomId: data.roomId }),
        };

        mutate(payload, {
            onSuccess: (complaint) => {
                reset();
                onSuccess?.(complaint.id);
            },
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof CreateComplaintFormValues, {
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
                {/* Hostel Selection (Combobox) */}
                <motion.div variants={rowVariants} className="space-y-1.5">
                    <Label
                        htmlFor="cc-hostel"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Hostel <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                        control={control}
                        name="hostelId"
                        render={({ field: { value, onChange } }) => (
                            <Combobox
                                options={hostelOptions}
                                value={value}
                                onValueChange={(val) => {
                                    onChange(val);
                                    setValue('roomId', '');
                                }}
                                placeholder={
                                    isLoadingHostels
                                        ? 'Loading hostels...'
                                        : 'Select a hostel...'
                                }
                                disabled={isLoadingHostels}
                                width="w-full" // Ensures responsiveness
                            />
                        )}
                    />

                    {errors.hostelId && (
                        <FieldError message={errors.hostelId.message!} />
                    )}
                </motion.div>

                {/* Room Selection (Combobox) — only shown when not strictly pre-filled by parent context */}
                {!roomId && (
                    <motion.div variants={rowVariants} className="space-y-1.5">
                        <Label
                            htmlFor="cc-room"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Room{' '}
                            <span className="text-gray-400 dark:text-gray-500">
                                (optional — leave blank for hostel-wide issues)
                            </span>
                        </Label>
                        <Controller
                            name="roomId"
                            control={control} // from your useForm() hook
                            render={({ field }) => (
                                <Combobox
                                    options={roomOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder={
                                        isLoadingRooms
                                            ? 'Loading rooms...'
                                            : 'Select a room...'
                                    }
                                    disabled={
                                        !currentHostelId || isLoadingRooms
                                    }
                                    width="w-full"
                                    emptyText="No rooms found for this hostel."
                                />
                            )}
                        />
                        {errors.roomId && (
                            <FieldError message={errors.roomId.message!} />
                        )}
                    </motion.div>
                )}

                {/* Title */}
                <motion.div variants={rowVariants} className="space-y-1.5">
                    <Label
                        htmlFor="cc-title"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="cc-title"
                        placeholder="Brief summary of the issue"
                        maxLength={200}
                        className={INPUT_CLS}
                        {...register('title')}
                    />
                    {errors.title && (
                        <FieldError message={errors.title.message!} />
                    )}
                </motion.div>

                {/* Category */}
                <motion.div variants={rowVariants} className="space-y-1.5">
                    <Label
                        htmlFor="cc-category"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Category <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        onValueChange={(val) =>
                            setValue(
                                'category',
                                val as CreateComplaintFormValues['category'],
                                { shouldValidate: true }
                            )
                        }
                    >
                        <SelectTrigger id="cc-category" className={SELECT_CLS}>
                            <SelectValue placeholder="Select a category…" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <SelectItem value="MAINTENANCE">
                                🔧 Maintenance
                            </SelectItem>
                            <SelectItem value="CLEANLINESS">
                                🧹 Cleanliness
                            </SelectItem>
                            <SelectItem value="SECURITY">
                                🔒 Security
                            </SelectItem>
                            <SelectItem value="NOISE">🔊 Noise</SelectItem>
                            <SelectItem value="BILLING">💳 Billing</SelectItem>
                            <SelectItem value="OTHER">📋 Other</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.category && (
                        <FieldError message={errors.category.message!} />
                    )}
                </motion.div>

                {/* Description */}
                <motion.div variants={rowVariants} className="space-y-1.5">
                    <Label
                        htmlFor="cc-description"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                        id="cc-description"
                        rows={4}
                        placeholder="Describe the issue in detail — when it started, how it affects you, what you've already tried…"
                        className={`${INPUT_CLS} resize-none`}
                        {...register('description')}
                    />
                    {errors.description && (
                        <FieldError message={errors.description.message!} />
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
                        Submit complaint
                    </Button>
                </motion.div>
            </form>
        </motion.div>
    );
}
