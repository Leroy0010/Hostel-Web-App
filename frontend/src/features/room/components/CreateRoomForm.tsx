import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/ImageUpload';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { useCreateRoom } from '../hooks/room.hooks';
import {
    createRoomSchema,
    type CreateRoomFormValues,
    type CreateRoomPayload,
} from '../types/room.types';
import type { ApiError } from '@/types/api';
import { FieldError } from '@/components/ui/FieldError';
import { transition } from '@/features/auth/utils/transition';

// =============================================================================
// Constants
// =============================================================================

const INPUT_CLS =
    'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600';

// =============================================================================
// Animation variants
// =============================================================================

const formVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.25, staggerChildren: 0.05 },
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

interface CreateRoomFormProps {
    /** UUID of the parent hostel. Required by the create-room API endpoint. */
    hostelId: string;
    /**
     * Called after the room is successfully created.
     * @param roomId - UUID of the newly created room.
     */
    onSuccess?: (roomId: string) => void;
    /** Called when the user clicks Cancel. */
    onCancel?: () => void;
    /**
     * Handles the image file upload and returns the stored URL.
     * @param file - Validated image file selected by the user.
     * @returns Promise resolving to the stored image URL.
     */
    onUploadImage: (file: File) => Promise<string>;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Manager form for creating a new room inside a hostel.
 *
 * Fields:
 *  - Cover image (required — via {@link ImageUpload}, populated after upload).
 *  - Room number (string, max 20 chars).
 *  - Room type enum select (SINGLE / DOUBLE / TRIPLE / QUAD / SHARED).
 *  - Capacity (1-20).
 *  - Price per semester (Ghana Cedis, BigDecimal string).
 *  - Floor number (optional integer).
 *  - Amenities (optional list — label + optional icon URL per item).
 *
 * Amenity list uses {@code useFieldArray} so each amenity row can be added
 * or removed independently without full form re-renders.
 *
 * Server-side {@code VALIDATION_FAILED} errors are mapped back onto the
 * corresponding form fields via {@code setError}.
 *
 * Designed to be rendered inside a {@code <Dialog>} or a dedicated page section.
 */
export function CreateRoomForm({
    hostelId,
    onSuccess,
    onCancel,
    onUploadImage,
}: CreateRoomFormProps) {
    const { mutate, isPending } = useCreateRoom(hostelId);
    const shouldReduceMotion = useReducedMotion();

    const {
        register,
        control,
        handleSubmit,
        setValue,
        setError,
        formState: { errors },
    } = useForm<CreateRoomFormValues>({
        resolver: zodResolver(createRoomSchema),
        defaultValues: {
            roomNumber: '',
            pricePerSemester: '',
            imageUrl: '',
            floorNumber: null,
            amenities: [],
        },
    });

    // Amenity field array — add/remove rows without unmounting the whole form
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'amenities',
    });

    const onSubmit = (data: CreateRoomFormValues) => {
        const payload: CreateRoomPayload = {
            roomNumber: data.roomNumber,
            roomType: data.roomType,
            capacity: data.capacity,
            pricePerSemester: data.pricePerSemester,
            imageUrl: data.imageUrl,
            ...(data.floorNumber !== null &&
                data.floorNumber !== undefined && {
                    floorNumber: data.floorNumber,
                }),
            ...(data.amenities &&
                data.amenities.length > 0 && {
                    amenities: data.amenities.map((a) => ({
                        amenity: a.amenity,
                        ...(a.imageUrl && { imageUrl: a.imageUrl }),
                    })),
                }),
        };

        mutate(payload, {
            onSuccess: (room) => {
                onSuccess?.(room.id);
            },
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof CreateRoomFormValues, {
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
                        Room image <span className="text-red-500">*</span>
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

                {/* ── Room number + Type (two columns) ────────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                    {/* Room number */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="cr-number"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Room number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="cr-number"
                            placeholder="e.g. A-101"
                            className={INPUT_CLS}
                            {...register('roomNumber')}
                        />
                        {errors.roomNumber && (
                            <FieldError message={errors.roomNumber.message!} />
                        )}
                    </div>

                    {/* Room type */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="cr-type"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Room type <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            onValueChange={(val) =>
                                setValue(
                                    'roomType',
                                    val as CreateRoomFormValues['roomType'],
                                    { shouldValidate: true }
                                )
                            }
                        >
                            <SelectTrigger id="cr-type" className={INPUT_CLS}>
                                <SelectValue placeholder="Select type…" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                                <SelectItem value="SINGLE">Single</SelectItem>
                                <SelectItem value="DOUBLE">Double</SelectItem>
                                <SelectItem value="TRIPLE">Triple</SelectItem>
                                <SelectItem value="QUAD">Quad</SelectItem>
                                <SelectItem value="SHARED">Shared</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.roomType && (
                            <FieldError message={errors.roomType.message!} />
                        )}
                    </div>
                </motion.div>

                {/* ── Capacity + Price (two columns) ───────────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                    {/* Capacity */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="cr-capacity"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Capacity <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="cr-capacity"
                            type="number"
                            min={1}
                            max={20}
                            placeholder="e.g. 2"
                            className={INPUT_CLS}
                            {...register('capacity', { valueAsNumber: true })}
                        />
                        {errors.capacity && (
                            <FieldError message={errors.capacity.message!} />
                        )}
                    </div>

                    {/* Price */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="cr-price"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Price per semester{' '}
                            <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
                                ₵
                            </span>
                            <Input
                                id="cr-price"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className={`pl-7 ${INPUT_CLS}`}
                                {...register('pricePerSemester')}
                            />
                        </div>
                        {errors.pricePerSemester && (
                            <FieldError
                                message={errors.pricePerSemester.message!}
                            />
                        )}
                    </div>
                </motion.div>

                {/* ── Floor number (optional) ──────────────────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="cr-floor"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Floor number{' '}
                        <span className="text-gray-400 dark:text-gray-500">
                            (optional)
                        </span>
                    </Label>
                    <Input
                        id="cr-floor"
                        type="number"
                        min={0}
                        placeholder="e.g. 1"
                        className={INPUT_CLS}
                        {...register('floorNumber', { valueAsNumber: true })}
                    />
                    {errors.floorNumber && (
                        <FieldError message={errors.floorNumber.message!} />
                    )}
                </motion.div>

                {/* ── Amenities (optional dynamic list) ───────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-3"
                >
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Amenities{' '}
                            <span className="text-gray-400 dark:text-gray-500">
                                (optional)
                            </span>
                        </Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                append({ amenity: '', imageUrl: '' })
                            }
                            className="h-7 gap-1 border-gray-200 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                            Add
                        </Button>
                    </div>

                    {/* Amenity rows */}
                    {fields.length === 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-600">
                            No amenities added. Click "Add" to attach amenities
                            to this room.
                        </p>
                    )}

                    <div className="space-y-2">
                        {fields.map((field, index) => (
                            <motion.div
                                key={field.id}
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.18 }}
                                className="flex items-start gap-2"
                            >
                                {/* Amenity label */}
                                <div className="flex-1 space-y-1">
                                    <Input
                                        placeholder="e.g. Air Conditioning"
                                        className={INPUT_CLS}
                                        {...register(
                                            `amenities.${index}.amenity`
                                        )}
                                    />
                                    {errors.amenities?.[index]?.amenity && (
                                        <FieldError
                                            message={
                                                errors.amenities[index]!
                                                    .amenity!.message!
                                            }
                                        />
                                    )}
                                </div>

                                {/* Icon URL (optional) */}
                                <div className="flex-1 space-y-1">
                                    <Input
                                        placeholder="Icon URL (optional)"
                                        className={INPUT_CLS}
                                        {...register(
                                            `amenities.${index}.imageUrl`
                                        )}
                                    />
                                </div>

                                {/* Remove button */}
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    aria-label={`Remove amenity ${index + 1}`}
                                    className="mt-2 shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-gray-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                >
                                    <Trash2
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                </button>
                            </motion.div>
                        ))}
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
                        Create room
                    </Button>
                </motion.div>
            </form>
        </motion.div>
    );
}
