import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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

import { useUpdateRoom, useUpdateRoomStatus } from '../hooks/room.hooks';
import {
    updateRoomSchema,
    updateRoomStatusSchema,
    type RoomDto,
    type UpdateRoomFormValues,
    type UpdateRoomStatusFormValues,
    type UpdateRoomPayload,
    type RoomStatus,
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
        transition: { duration: 0.25, staggerChildren: 0.04 },
    },
};

const rowVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
        opacity: 1,
        y: 0,
        transition: transition,
    },
};

// =============================================================================
// Props
// =============================================================================

interface UpdateRoomFormProps {
    /** The room entity being edited — used to pre-populate all fields. */
    room: RoomDto;
    /** UUID of the parent hostel (required for mutation cache invalidation). */
    hostelId: string;
    /** Called after a successful save. */
    onSuccess?: (room: RoomDto) => void;
    /** Called when the user clicks Cancel. */
    onCancel?: () => void;
    /**
     * Handles image file upload and returns the stored URL.
     * @param file - The validated image file.
     * @returns Promise resolving to the stored public URL.
     */
    onUploadImage: (file: File) => Promise<string>;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Manager patch form for updating an existing room.
 *
 * Split into two independent sections:
 *
 *  1. **Room details form** — image, number, type, capacity, price, floor.
 *     Uses {@code PUT /api/manager/rooms/{id}} with patch semantics (null = ignored).
 *     Only fields that changed from their original values are included in the payload.
 *
 *  2. **Status update** — inline select + button using a separate mutation
 *     ({@code PATCH /api/manager/rooms/{id}/status}) so status changes are
 *     atomic and don't accidentally overwrite other in-flight edits.
 *
 * Designed to render inside a {@code <Dialog>} or dedicated page section.
 */
export function UpdateRoomForm({
    room,
    hostelId,
    onSuccess,
    onCancel,
    onUploadImage,
}: UpdateRoomFormProps) {
    const { mutate: updateDetails, isPending: isUpdating } = useUpdateRoom(
        room.id,
        hostelId
    );
    const { mutate: updateStatus, isPending: isUpdatingStatus } =
        useUpdateRoomStatus(room.id, hostelId);
    const shouldReduceMotion = useReducedMotion();

    // ── Details form ─────────────────────────────────────────────────────────
    const {
        register,
        control,
        handleSubmit,
        setValue,
        setError,
        reset,
        formState: { errors },
    } = useForm<UpdateRoomFormValues>({
        resolver: zodResolver(updateRoomSchema),
        defaultValues: {
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            capacity: room.capacity,
            pricePerSemester: room.pricePerSemester,
            imageUrl: room.imageUrl,
            floorNumber: room.floorNumber,
        },
    });

    // Re-populate when the room prop changes (e.g. navigating between rooms)
    useEffect(() => {
        reset({
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            capacity: room.capacity,
            pricePerSemester: room.pricePerSemester,
            imageUrl: room.imageUrl,
            floorNumber: room.floorNumber,
        });
    }, [room, reset]);

    // ── Status form ──────────────────────────────────────────────────────────
    const {
        setValue: setStatusValue,
        handleSubmit: handleStatusSubmit,
        formState: { errors: statusErrors },
    } = useForm<UpdateRoomStatusFormValues>({
        resolver: zodResolver(updateRoomStatusSchema),
        defaultValues: { status: room.status },
    });

    const onSubmitDetails = (data: UpdateRoomFormValues) => {
        // Only include fields that actually changed
        const payload: UpdateRoomPayload = {};
        if (data.roomNumber && data.roomNumber !== room.roomNumber)
            payload.roomNumber = data.roomNumber;
        if (data.roomType && data.roomType !== room.roomType)
            payload.roomType = data.roomType;
        if (data.capacity !== undefined && data.capacity !== room.capacity)
            payload.capacity = data.capacity;
        if (
            data.pricePerSemester &&
            Number(data.pricePerSemester) !== Number(room.pricePerSemester)
        )
            payload.pricePerSemester = data.pricePerSemester;
        if (data.imageUrl && data.imageUrl !== room.imageUrl)
            payload.imageUrl = data.imageUrl;
        if (data.floorNumber !== room.floorNumber)
            payload.floorNumber = data.floorNumber ?? undefined;

        updateDetails(payload, {
            onSuccess: (updated) => onSuccess?.(updated),
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof UpdateRoomFormValues, {
                            type: 'server',
                            message: messages[0],
                        });
                    });
                }
            },
        });
    };

    const onSubmitStatus = (data: UpdateRoomStatusFormValues) => {
        updateStatus(data.status as RoomStatus, {
            onSuccess: (updated) => onSuccess?.(updated),
        });
    };

    const motionProps = shouldReduceMotion
        ? {}
        : { variants: formVariants, initial: 'hidden', animate: 'visible' };

    return (
        <motion.div {...motionProps} className="space-y-8">
            {/* ── Section 1: Room details ──────────────────────────────── */}
            <form
                onSubmit={handleSubmit(onSubmitDetails)}
                className="space-y-5"
                noValidate
            >
                <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                    Room details
                </p>

                {/* Cover image */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Room image
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

                {/* Room number + type */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="ur-number"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Room number
                        </Label>
                        <Input
                            id="ur-number"
                            className={INPUT_CLS}
                            {...register('roomNumber')}
                        />
                        {errors.roomNumber && (
                            <FieldError message={errors.roomNumber.message!} />
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label
                            htmlFor="ur-type"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Room type
                        </Label>
                        <Controller
                            control={control}
                            name="roomType"
                            render={({ field }) => (
                                <Select
                                    value={field.value}
                                    onValueChange={(val) =>
                                        setValue(
                                            'roomType',
                                            val as UpdateRoomFormValues['roomType'],
                                            { shouldValidate: true }
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="ur-type"
                                        className={INPUT_CLS}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                                        <SelectItem value="SINGLE">
                                            Single
                                        </SelectItem>
                                        <SelectItem value="DOUBLE">
                                            Double
                                        </SelectItem>
                                        <SelectItem value="TRIPLE">
                                            Triple
                                        </SelectItem>
                                        <SelectItem value="QUAD">
                                            Quad
                                        </SelectItem>
                                        <SelectItem value="SHARED">
                                            Shared
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.roomType && (
                            <FieldError message={errors.roomType.message!} />
                        )}
                    </div>
                </motion.div>

                {/* Capacity + Price */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="ur-capacity"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Capacity
                        </Label>
                        <Input
                            id="ur-capacity"
                            type="number"
                            min={1}
                            max={20}
                            className={INPUT_CLS}
                            {...register('capacity', { valueAsNumber: true })}
                        />
                        {errors.capacity && (
                            <FieldError message={errors.capacity.message!} />
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label
                            htmlFor="ur-price"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Price per semester
                        </Label>
                        <div className="relative">
                            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
                                ₵
                            </span>
                            <Input
                                id="ur-price"
                                type="number"
                                min="0"
                                step="0.01"
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

                {/* Floor number */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="ur-floor"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Floor number{' '}
                        <span className="text-gray-400 dark:text-gray-500">
                            (optional)
                        </span>
                    </Label>
                    <Input
                        id="ur-floor"
                        type="number"
                        min={0}
                        className={INPUT_CLS}
                        {...register('floorNumber', { valueAsNumber: true })}
                    />
                    {errors.floorNumber && (
                        <FieldError message={errors.floorNumber.message!} />
                    )}
                </motion.div>

                {/* Save details actions */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"
                >
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isUpdating}
                            className="border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={isUpdating}
                        className="bg-gray-900 font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                    >
                        {isUpdating && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save changes
                    </Button>
                </motion.div>
            </form>

            {/* ── Section 2: Operational status ───────────────────────── */}
            <div className="space-y-3 border-t border-gray-200 pt-6 dark:border-gray-800">
                <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                    Operational status
                </p>
                <form
                    onSubmit={handleStatusSubmit(onSubmitStatus)}
                    className="flex items-end gap-3"
                    noValidate
                >
                    <div className="flex-1 space-y-1.5">
                        <Label
                            htmlFor="ur-status"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Status
                        </Label>
                        <Select
                            defaultValue={room.status}
                            onValueChange={(val) =>
                                setStatusValue('status', val as RoomStatus, {
                                    shouldValidate: true,
                                })
                            }
                        >
                            <SelectTrigger id="ur-status" className={INPUT_CLS}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                                <SelectItem value="AVAILABLE">
                                    Available
                                </SelectItem>
                                <SelectItem value="FULLY_OCCUPIED">
                                    Fully Occupied
                                </SelectItem>
                                <SelectItem value="UNDER_MAINTENANCE">
                                    Under Maintenance
                                </SelectItem>
                                <SelectItem value="RESERVED">
                                    Reserved
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {statusErrors.status && (
                            <FieldError
                                message={statusErrors.status.message!}
                            />
                        )}
                    </div>
                    <Button
                        type="submit"
                        variant="outline"
                        disabled={isUpdatingStatus}
                        className="border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        {isUpdatingStatus && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Update
                    </Button>
                </form>
            </div>
        </motion.div>
    );
}
