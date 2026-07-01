import { useState } from 'react';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import { z } from 'zod';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/ImageUpload';

import { useReplaceAmenities, useDeleteAmenity } from '../hooks/room.hooks';
import type { AmenityDto, AmenityPayload } from '../types/room.types';

// =============================================================================
// Schema
// =============================================================================

const amenityListSchema = z.object({
    amenities: z
        .array(
            z.object({
                amenity: z
                    .string()
                    .min(1, 'Label required')
                    .max(100, 'Max 100 characters'),
                imageUrl: z.string().optional(),
            })
        )
        .min(1, 'Add at least one amenity'),
});

type AmenityListForm = z.infer<typeof amenityListSchema>;

// =============================================================================
// Props
// =============================================================================

interface AmenityManagerProps {
    /** UUID of the room whose amenities are being managed. */
    roomId: string;
    /** UUID of the parent hostel — used for cache invalidation after mutations. */
    hostelId: string;
    /** Current amenities already attached to this room. */
    currentAmenities: AmenityDto[];
    /**
     * Handles the image file upload and returns the stored URL.
     * Required for uploading new amenity icons.
     */
    onUploadImage: (file: File) => Promise<string>;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Manager amenity management panel for a single room.
 *
 * Two interaction modes:
 *
 * 1. **Inline delete** — each existing amenity has a delete button that fires
 * {@code DELETE /api/manager/amenities/{amenityId}} immediately (no confirm).
 * Feedback is instant via React Query cache invalidation.
 *
 * 2. **Batch replace** — an editable list below the existing chips lets the
 * manager compose a complete new amenity set and submit it in one call
 * ({@code PUT /api/manager/rooms/{id}/amenities}).
 * This replaces ALL amenities atomically, avoiding partial-update races.
 *
 * The two modes are deliberately separated: individual delete for quick
 * removals, batch replace for wholesale updates, matching the backend API
 * design.
 *
 * @example
 * ```tsx
 * <AmenityManager
 * roomId={room.id}
 * hostelId={room.hostelId}
 * currentAmenities={room.amenities}
 * onUploadImage={uploadImageToS3}
 * />
 * ```
 */
export function AmenityManager({
    roomId,
    hostelId,
    currentAmenities,
    onUploadImage,
}: AmenityManagerProps) {
    const [showReplaceForm, setShowReplaceForm] = useState(false);

    const { mutate: replaceAll, isPending: isReplacing } = useReplaceAmenities(
        roomId,
        hostelId
    );
    const { mutate: deleteOne, isPending: isDeleting } = useDeleteAmenity(
        roomId,
        hostelId
    );

    // Field array for the batch-replace form
    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<AmenityListForm>({
        resolver: zodResolver(amenityListSchema),
        defaultValues: {
            // Pre-populate with existing amenities so the manager can edit-in-place
            amenities: currentAmenities.map((a) => ({
                amenity: a.amenity,
                imageUrl: a.imageUrl ?? '',
            })),
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'amenities',
    });

    const onSubmitReplace = (data: AmenityListForm) => {
        const payload: AmenityPayload[] = data.amenities.map((a) => ({
            amenity: a.amenity,
            ...(a.imageUrl && { imageUrl: a.imageUrl }),
        }));

        replaceAll(payload, {
            onSuccess: () => setShowReplaceForm(false),
        });
    };

    const INPUT_CLS =
        'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600';

    return (
        <div className="space-y-4">
            {/* ── Section header ───────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                    Amenities
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReplaceForm((prev) => !prev)}
                    className="h-7 gap-1 border-gray-200 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                    <Wand2 className="h-3 w-3" aria-hidden="true" />
                    {showReplaceForm ? 'Cancel replace' : 'Replace all'}
                </Button>
            </div>

            {/* ── Existing amenities with inline delete ────────────────── */}
            {currentAmenities.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-600">
                    No amenities attached. Use "Replace all" to add them.
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    <AnimatePresence mode="popLayout">
                        {currentAmenities.map((amenity) => (
                            <motion.div
                                key={amenity.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                transition={{ duration: 0.18 }}
                                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-1 pr-1.5 pl-2.5 dark:border-gray-800 dark:bg-gray-900"
                            >
                                {/* Optional icon */}
                                {amenity.imageUrl && (
                                    <img
                                        src={amenity.imageUrl}
                                        alt=""
                                        className="h-3.5 w-3.5 object-contain"
                                        aria-hidden="true"
                                        onError={(e) => {
                                            (
                                                e.currentTarget as HTMLImageElement
                                            ).style.display = 'none';
                                        }}
                                    />
                                )}
                                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                                    {amenity.amenity}
                                </span>

                                {/* Delete button */}
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => deleteOne(amenity.id)}
                                    aria-label={`Remove ${amenity.amenity}`}
                                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500 disabled:opacity-40 dark:text-gray-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                >
                                    <Trash2
                                        className="h-2.5 w-2.5"
                                        aria-hidden="true"
                                    />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Batch replace form (collapsible) ─────────────────────── */}
            <AnimatePresence>
                {showReplaceForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{
                            duration: 0.25,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        className="overflow-hidden"
                    >
                        <form
                            onSubmit={handleSubmit(onSubmitReplace)}
                            className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/60"
                            noValidate
                        >
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                This replaces <strong>all</strong> existing
                                amenities with the list below.
                            </p>

                            {/* Amenity rows */}
                            <div className="space-y-4 sm:space-y-3">
                                {fields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-3 sm:flex-row sm:items-start sm:border-none sm:bg-transparent sm:p-0 dark:border-gray-800 dark:bg-gray-950 dark:sm:bg-transparent"
                                    >
                                        <div className="flex-1 space-y-1.5">
                                            <Label className="text-xs text-gray-500 sm:hidden">
                                                Amenity Name{' '}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                placeholder="Label, e.g. Air Conditioning"
                                                className={INPUT_CLS}
                                                {...register(
                                                    `amenities.${index}.amenity`
                                                )}
                                            />
                                            {errors.amenities?.[index]
                                                ?.amenity && (
                                                <p className="mt-0.5 text-xs font-medium text-red-500">
                                                    {
                                                        errors.amenities[index]!
                                                            .amenity!.message
                                                    }
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <Label className="text-xs text-gray-500 sm:hidden">
                                                Icon (optional)
                                            </Label>
                                            <Controller
                                                control={control}
                                                name={`amenities.${index}.imageUrl`}
                                                render={({
                                                    field: uploadField,
                                                }) => (
                                                    <ImageUpload
                                                        value={
                                                            uploadField.value ||
                                                            undefined
                                                        }
                                                        onChange={
                                                            uploadField.onChange
                                                        }
                                                        onUpload={onUploadImage}
                                                        hint="PNG, SVG, WEBP"
                                                    />
                                                )}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => remove(index)}
                                            aria-label={`Remove row ${index + 1}`}
                                            className="mt-1 shrink-0 self-end rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 sm:self-auto dark:text-gray-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                        >
                                            <Trash2
                                                className="h-4 w-4"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add row button */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    append({ amenity: '', imageUrl: '' })
                                }
                                className="h-7 gap-1 border-gray-200 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                            >
                                <Plus className="h-3 w-3" aria-hidden="true" />
                                Add row
                            </Button>

                            {/* Submit */}
                            <div className="flex justify-end pt-2">
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isReplacing}
                                    className="gap-1.5 bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                                >
                                    {isReplacing ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Save
                                            className="h-3.5 w-3.5"
                                            aria-hidden="true"
                                        />
                                    )}
                                    Save amenities
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
