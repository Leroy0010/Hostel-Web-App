import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/ImageUpload';

import { useUpdateHostel } from '../hooks/hostel.hooks';
import {
    updateHostelSchema,
    type HostelDto,
    type UpdateHostelFormValues,
    type UpdateHostelPayload,
} from '../types/hostel.types';
import type { ApiError } from '@/types/api';
import { transition } from '../../auth/utils/transition';

// =============================================================================
// Shared internal constants
// =============================================================================

/** Shared input Tailwind classes — consistent with CreateHostelForm. */
const INPUT_CLS =
    'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600';

// =============================================================================
// Animation variants
// =============================================================================

const formVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.25, staggerChildren: 0.04 },
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
// Props
// =============================================================================

interface UpdateHostelFormProps {
    /**
     * The hostel entity being edited.
     * Used to pre-populate all form fields with existing values.
     */
    hostel: HostelDto;
    /**
     * When {@code true}, uses the manager-scoped update endpoint
     * ({@code PUT /api/manager/hostels/{id}}).
     * When {@code false} (default), uses the admin endpoint
     * ({@code PUT /api/admin/hostels/{id}}).
     */
    isManager?: boolean;
    /** Called with the updated {@link HostelDto} after a successful save. */
    onSuccess?: (hostel: HostelDto) => void;
    /** Called when the user clicks Cancel. */
    onCancel?: () => void;
    /**
     * Handles the actual image file upload.
     *
     * @param file - The validated image file.
     * @returns Promise resolving to the stored public URL.
     */
    onUploadImage: (file: File) => Promise<string>;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Patch form for updating an existing hostel.
 *
 * Pre-populates all fields from the provided {@link HostelDto}.
 * Only fields that have changed from their original values are included in the
 * API payload — matching the backend's patch semantics (null = ignored).
 *
 * Supports both admin mode (all fields) and manager mode (same fields, different
 * endpoint called via the {@link isManager} prop).
 *
 * Image update flow:
 *  1. Existing {@code imageUrl} is shown immediately as the preview.
 *  2. If the user uploads a new image, the resolved URL overwrites the field.
 *  3. The new URL is included in the payload only if it differs from the original.
 */
export function UpdateHostelForm({
    hostel,
    isManager = false,
    onSuccess,
    onCancel,
    onUploadImage,
}: UpdateHostelFormProps) {
    const { mutate, isPending } = useUpdateHostel(hostel.id, isManager);
    const shouldReduceMotion = useReducedMotion();

    const {
        register,
        control,
        handleSubmit,
        setValue,
        setError,
        reset,
        formState: { errors },
    } = useForm<UpdateHostelFormValues>({
        resolver: zodResolver(updateHostelSchema),
        defaultValues: {
            name: hostel.name,
            address: hostel.address,
            description: hostel.description ?? '',
            genderPolicy: hostel.genderPolicy,
            imageUrl: hostel.imageUrl,
            latitude: hostel.latitude ?? undefined,
            longitude: hostel.longitude ?? undefined,
        },
    });

    // Re-populate if the hostel prop changes (e.g. navigating between hostels)
    useEffect(() => {
        reset({
            name: hostel.name,
            address: hostel.address,
            description: hostel.description ?? '',
            genderPolicy: hostel.genderPolicy,
            imageUrl: hostel.imageUrl,
            latitude: hostel.latitude ?? undefined,
            longitude: hostel.longitude ?? undefined,
        });
    }, [hostel, reset]);

    const onSubmit = (data: UpdateHostelFormValues) => {
        // Only send fields that actually changed from the original hostel data.
        // Sending unchanged values is harmless but keeping payloads minimal is
        // a good practice for patch-semantics endpoints.
        const payload: UpdateHostelPayload = {};

        if (data.name && data.name !== hostel.name) payload.name = data.name;
        if (data.address && data.address !== hostel.address)
            payload.address = data.address;
        if (data.description !== (hostel.description ?? ''))
            payload.description = data.description;
        if (data.genderPolicy && data.genderPolicy !== hostel.genderPolicy)
            payload.genderPolicy = data.genderPolicy;
        if (data.imageUrl && data.imageUrl !== hostel.imageUrl)
            payload.imageUrl = data.imageUrl;
        if (data.latitude !== undefined && data.latitude !== hostel.latitude)
            payload.latitude = data.latitude;
        if (data.longitude !== undefined && data.longitude !== hostel.longitude)
            payload.longitude = data.longitude;

        mutate(payload, {
            onSuccess: (updated) => {
                onSuccess?.(updated);
            },
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof UpdateHostelFormValues, {
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
                {/* ── Cover image ─────────────────────────────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cover image
                    </Label>
                    <Controller
                        control={control}
                        name="imageUrl"
                        render={({ field }) => (
                            <ImageUpload
                                value={field.value || undefined}
                                onChange={field.onChange}
                                onUpload={onUploadImage}
                                aspectRatio="aspect-video"
                                hint="JPEG, PNG, WEBP — max 5 MB"
                            />
                        )}
                    />
                    {errors.imageUrl && (
                        <FieldError message={errors.imageUrl.message!} />
                    )}
                </motion.div>

                {/* ── Name ────────────────────────────────────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="uh-name"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Hostel name
                    </Label>
                    <Input
                        id="uh-name"
                        className={INPUT_CLS}
                        {...register('name')}
                    />
                    {errors.name && (
                        <FieldError message={errors.name.message!} />
                    )}
                </motion.div>

                {/* ── Address ─────────────────────────────────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="uh-address"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Address
                    </Label>
                    <Input
                        id="uh-address"
                        className={INPUT_CLS}
                        {...register('address')}
                    />
                    {errors.address && (
                        <FieldError message={errors.address.message!} />
                    )}
                </motion.div>

                {/* ── Description ─────────────────────────────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="uh-description"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Description{' '}
                        <span className="text-gray-400 dark:text-gray-500">
                            (optional)
                        </span>
                    </Label>
                    <Textarea
                        id="uh-description"
                        rows={3}
                        className={`${INPUT_CLS} resize-none`}
                        {...register('description')}
                    />
                    {errors.description && (
                        <FieldError message={errors.description.message!} />
                    )}
                </motion.div>

                {/* ── Gender policy ────────────────────────────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="uh-gender"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Gender policy
                    </Label>
                    <Controller
                        control={control}
                        name="genderPolicy"
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onValueChange={(val) =>
                                    setValue(
                                        'genderPolicy',
                                        val as UpdateHostelFormValues['genderPolicy'],
                                        { shouldValidate: true }
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="uh-gender"
                                    className={INPUT_CLS}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                                    <SelectItem value="MALE_ONLY">
                                        Male Only
                                    </SelectItem>
                                    <SelectItem value="FEMALE_ONLY">
                                        Female Only
                                    </SelectItem>
                                    <SelectItem value="MIXED">Mixed</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.genderPolicy && (
                        <FieldError message={errors.genderPolicy.message!} />
                    )}
                </motion.div>

                {/* ── Coordinates ─────────────────────────────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="uh-lat"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Latitude{' '}
                            <span className="text-gray-400 dark:text-gray-500">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="uh-lat"
                            type="number"
                            step="any"
                            placeholder="e.g. 5.1264"
                            className={INPUT_CLS}
                            {...register('latitude')}
                        />
                        {errors.latitude && (
                            <FieldError message={errors.latitude.message!} />
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="uh-lon"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Longitude{' '}
                            <span className="text-gray-400 dark:text-gray-500">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="uh-lon"
                            type="number"
                            step="any"
                            placeholder="e.g. -1.2922"
                            className={INPUT_CLS}
                            {...register('longitude')}
                        />
                        {errors.longitude && (
                            <FieldError message={errors.longitude.message!} />
                        )}
                    </div>
                </motion.div>

                {/* ── Actions ─────────────────────────────────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"
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

// =============================================================================
// Internal helpers
// =============================================================================

/** Animated inline field error message. */
function FieldError({ message }: { message: string }) {
    return (
        <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-medium text-red-500 dark:text-red-400"
            role="alert"
        >
            {message}
        </motion.p>
    );
}
