import { useEffect, useMemo } from 'react';
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

import { useCreateLandmark, useUpdateLandmark } from '../hooks/map.hooks';
import {
    createLandmarkSchema,
    type CreateLandmarkFormValues,
    type CreateLandmarkPayload,
    type LandmarkCategory,
    type LandmarkDto,
    type UpdateLandmarkPayload,
} from '../types/map.types';
import { categoryIcon, categoryLabel } from '../utils/map.utils';
import { transition } from '@/features/auth/utils/transition';
import type { ApiError } from '@/types/api';
import { Combobox } from '@/components/ui/my-combobox';
import { useActiveHostels } from '@/features/hostel/hooks/hostel.hooks';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface CreateLandmarkFormProps {
    /** Called after a successful create or update. */
    onSuccess?: () => void;
    onCancel?: () => void;
    /**
     * Optional pre-filled coordinates from a map click event.
     * When the admin clicks the map to place a pin, these are passed in.
     */
    prefillLatLng?: { lat: number; lng: number };
    /**
     * When provided, the form runs in **edit mode** — pre-populates all fields
     * from the existing landmark and calls {@code useUpdateLandmark} on submit.
     */
    initialValues?: LandmarkDto;
    /**
     * Must be {@code true} when {@code initialValues} is provided.
     * Controls the submit button label and which mutation is called.
     */
    isEditing?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const ALL_CATEGORIES: LandmarkCategory[] = [
    'ACADEMIC',
    'LIBRARY',
    'ADMINISTRATIVE',
    'CAFETERIA',
    'MEDICAL',
    'SPORTS',
    'HOSTEL',
    'OTHER',
];

const INPUT_CLS =
    'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition },
};

const rowVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Unified create / edit form for campus landmarks (ADMIN only).
 *
 * **Create mode** (default):
 *  - All fields start empty (except coordinates if {@code prefillLatLng} is set).
 *  - Calls {@code POST /api/admin/landmarks} on submit.
 *
 * **Edit mode** ({@code isEditing=true} + {@code initialValues}):
 *  - All fields are pre-populated from the existing {@link LandmarkDto}.
 *  - Calls {@code PUT /api/admin/landmarks/{id}} on submit.
 *  - Re-populates form fields if {@code initialValues} changes (e.g. opening
 *    different landmarks in the same dialog without unmounting).
 *
 * **Map-click coordinate pre-fill** ({@code prefillLatLng}):
 *  - When the admin clicks the map to place a pin, those coordinates are
 *    passed in and auto-populate the lat/lng fields — reducing entry errors.
 */
export function CreateLandmarkForm({
    onSuccess,
    onCancel,
    prefillLatLng,
    initialValues,
    isEditing = false,
}: CreateLandmarkFormProps) {
    const { mutate: create, isPending: isCreating } = useCreateLandmark();
    const { mutate: update, isPending: isUpdating } = useUpdateLandmark(
        initialValues?.id ?? ''
    );

    const { data: hostels, isLoading: isHostelsLoading } = useActiveHostels();

    // Map queries to ComboboxOption format
    const hostelOptions = useMemo(() => {
        return (
            hostels?.content.map((h) => ({ label: h.name, value: h.id })) || []
        );
    }, [hostels]);

    const isPending = isCreating || isUpdating;

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        reset,
        watch,
        control,
        formState: { errors },
    } = useForm<CreateLandmarkFormValues>({
        resolver: zodResolver(createLandmarkSchema),
        defaultValues:
            isEditing && initialValues
                ? {
                      name: initialValues.name,
                      category: initialValues.category,
                      latitude: initialValues.latitude,
                      longitude: initialValues.longitude,
                      description: initialValues.description ?? '',
                      hostelId: initialValues.hostelId ?? undefined,
                  }
                : {
                      name: '',
                      description: '',
                      latitude: prefillLatLng?.lat,
                      longitude: prefillLatLng?.lng,
                  },
    });

    // eslint-disable-next-line react-hooks/incompatible-library
    const category = watch('category');

    // Re-populate when switching between different landmarks in the same dialog
    useEffect(() => {
        if (isEditing && initialValues) {
            reset({
                name: initialValues.name,
                category: initialValues.category,
                latitude: initialValues.latitude,
                longitude: initialValues.longitude,
                description: initialValues.description ?? '',
                hostelId: initialValues.hostelId ?? undefined,
            });
        }
    }, [isEditing, initialValues, reset]);

    const onSubmit = (data: CreateLandmarkFormValues) => {
        const handleError = (err: ApiError) => {
            if (err.code === 'VALIDATION_FAILED' && err.details) {
                Object.entries(err.details).forEach(([field, messages]) => {
                    setError(field as keyof CreateLandmarkFormValues, {
                        type: 'server',
                        message: messages[0],
                    });
                });
            }
        };

        if (isEditing && initialValues) {
            // Build only the fields that changed — patch semantics
            const payload: UpdateLandmarkPayload = {};
            if (data.name !== initialValues.name) payload.name = data.name;
            if (data.category !== initialValues.category)
                payload.category = data.category;
            if (data.latitude !== initialValues.latitude)
                payload.latitude = data.latitude;
            if (data.longitude !== initialValues.longitude)
                payload.longitude = data.longitude;
            if (data.hostelId !== initialValues.hostelId)
                payload.hostelId = data.hostelId;
            const newDesc = data.description ?? '';
            const existingDesc = initialValues.description ?? '';
            if (newDesc !== existingDesc)
                payload.description = newDesc || undefined;

            update(payload, {
                onSuccess: () => onSuccess?.(),
                onError: handleError,
            });
        } else {
            const payload: CreateLandmarkPayload = {
                name: data.name,
                category: data.category,
                latitude: data.latitude,
                longitude: data.longitude,
                hostelId: data.hostelId ? data.hostelId : undefined,
                ...(data.description?.trim() && {
                    description: data.description.trim(),
                }),
            };
            create(payload, {
                onSuccess: () => onSuccess?.(),
                onError: handleError,
            });
        }
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
                {/* Coordinate pre-fill notice */}
                {prefillLatLng && !isEditing && (
                    <motion.div
                        variants={rowVariants}
                        className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300"
                    >
                        <span aria-hidden="true">📍</span>
                        Coordinates pre-filled from your map click. Adjust if
                        needed.
                    </motion.div>
                )}

                {/* Name */}
                <motion.div variants={rowVariants} className="space-y-1.5">
                    <Label
                        htmlFor="cl-name"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="cl-name"
                        placeholder="e.g. Sam Jonah Library"
                        className={INPUT_CLS}
                        {...register('name')}
                    />
                    {errors.name && (
                        <FieldError message={errors.name.message!} />
                    )}
                </motion.div>

                {/* Category */}
                <motion.div variants={rowVariants} className="space-y-1.5">
                    <Label
                        htmlFor="cl-cat"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Category <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        defaultValue={
                            isEditing ? initialValues?.category : undefined
                        }
                        onValueChange={(val) => {
                            setValue('category', val as LandmarkCategory, {
                                shouldValidate: true,
                            });
                            if ((val as LandmarkCategory) !== 'HOSTEL') {
                                setValue('hostelId', undefined);
                            }
                        }}
                    >
                        <SelectTrigger
                            id="cl-cat"
                            className={cn(INPUT_CLS, 'w-36')}
                        >
                            <SelectValue placeholder="Select category…" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            {ALL_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                    {categoryIcon(cat)} {categoryLabel(cat)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.category && (
                        <FieldError message={errors.category.message!} />
                    )}
                </motion.div>

                {category === 'HOSTEL' && (
                    <motion.div variants={rowVariants} className="space-y-1.5">
                        <Label
                            htmlFor="cl-cat"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Hostel{' '}
                            <span className="text-gray-400 dark:text-gray-500">
                                (optional)
                            </span>
                        </Label>
                        <Controller
                            control={control}
                            name="hostelId"
                            render={({ field: { onChange, value } }) => (
                                <Combobox
                                    options={hostelOptions}
                                    disabled={isHostelsLoading}
                                    onValueChange={onChange}
                                    value={value}
                                    emptyText="Select a hostel"
                                    placeholder="Select a corresponding hostel if exists"
                                    width="full"
                                />
                            )}
                        />
                    </motion.div>
                )}

                {/* Coordinates */}
                <motion.div
                    variants={rowVariants}
                    className="grid grid-cols-2 gap-4"
                >
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="cl-lat"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Latitude <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="cl-lat"
                            type="number"
                            step="any"
                            placeholder="5.1054"
                            className={INPUT_CLS}
                            {...register('latitude', { valueAsNumber: true })}
                        />
                        {errors.latitude && (
                            <FieldError message={errors.latitude.message!} />
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="cl-lng"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Longitude <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="cl-lng"
                            type="number"
                            step="any"
                            placeholder="-1.2777"
                            className={INPUT_CLS}
                            {...register('longitude', { valueAsNumber: true })}
                        />
                        {errors.longitude && (
                            <FieldError message={errors.longitude.message!} />
                        )}
                    </div>
                </motion.div>

                {/* Description */}
                <motion.div variants={rowVariants} className="space-y-1.5">
                    <Label
                        htmlFor="cl-desc"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Description{' '}
                        <span className="text-gray-400 dark:text-gray-500">
                            (optional)
                        </span>
                    </Label>
                    <Textarea
                        id="cl-desc"
                        rows={2}
                        placeholder="Brief description shown in the map popup…"
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
                        {isEditing ? 'Save changes' : 'Add landmark'}
                    </Button>
                </motion.div>
            </form>
        </motion.div>
    );
}
