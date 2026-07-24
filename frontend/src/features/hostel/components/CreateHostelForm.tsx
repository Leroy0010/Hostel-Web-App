import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

import { useCreateHostel } from '../hooks/hostel.hooks';
import {
    createHostelSchema,
    type CreateHostelFormValues,
    type CreateHostelInputValues,
    type CreateHostelPayload,
} from '../types/hostel.types';
import { FieldError } from '@/components/ui/FieldError';
import { transition } from '@/features/auth/utils/transition';
import { cn } from '@/lib/utils';
import { useGetManagers } from '@/features/user/hooks/user.hooks';
import { useMemo } from 'react';
import { Combobox } from '@/components/ui/my-combobox';

// =============================================================================
// Types
// =============================================================================

interface CreateHostelFormProps {
    /**
     * Called after the hostel is successfully created.
     * Use this to close a parent dialog or navigate to the new hostel.
     *
     * @param hostelId - UUID of the newly created hostel.
     */
    onSuccess?: (hostelId: string) => void;
    /** Called when the user clicks Cancel. */
    onCancel?: () => void;
    /**
     * Handles the actual image upload to the server / S3.
     * Receives the selected File and must resolve with the public URL.
     *
     * @param file - The validated image file selected by the user.
     * @returns Promise resolving to the stored image URL.
     */
    onUploadImage: (file: File) => Promise<string>;
}

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
// Component
// =============================================================================

/**
 * Admin-only form for creating a new hostel.
 *
 * Fields:
 *  - Cover image (via {@link ImageUpload} — required before submit).
 *  - Name, Address, Description.
 *  - Gender policy (MALE_ONLY / FEMALE_ONLY / MIXED).
 *  - Optional latitude and longitude for campus map integration.
 *  - Optional manager UUID (can be assigned after creation).
 *
 * Image upload flow:
 *  1. User selects an image in {@link ImageUpload}.
 *  2. The component calls {@link onUploadImage} to persist the file.
 *  3. The resolved URL is written into the `imageUrl` form field via Controller.
 *  4. The field is required — form submission is blocked until an image is uploaded.
 *
 * Server-side {@code VALIDATION_FAILED} errors are mapped back onto individual
 * form fields so the user sees inline messages rather than generic toasts.
 *
 * Designed to be rendered inside a {@code <Dialog>} or a dedicated admin page.
 */
export function CreateHostelForm({
    onSuccess,
    onCancel,
    onUploadImage,
}: CreateHostelFormProps) {
    const { mutate, isPending } = useCreateHostel();
    const shouldReduceMotion = useReducedMotion();

    const { data: managers = [], isLoading: isManagersLoading } =
        useGetManagers();

    const managerOptions = useMemo(
        () =>
            managers.map((manager) => ({
                value: manager.id,
                label: manager.name,
            })),
        [managers]
    );

    const {
        register,
        control,
        handleSubmit,
        setValue,
        setError,
        formState: { errors },
    } = useForm<CreateHostelInputValues>({
        resolver: zodResolver(createHostelSchema),
        defaultValues: {
            name: '',
            address: '',
            description: '',
            imageUrl: '',
            managerId: '',
        },
    });

    const onSubmit = (data: CreateHostelFormValues) => {
        // Build the API payload — strip empty optional fields
        const payload: CreateHostelPayload = {
            name: data.name,
            address: data.address,
            genderPolicy: data.genderPolicy,
            imageUrl: data.imageUrl,
            ...(data.description && { description: data.description }),
            ...(data.latitude !== undefined && { latitude: data.latitude }),
            ...(data.longitude !== undefined && { longitude: data.longitude }),
            ...(data.managerId && { managerId: data.managerId }),
        };

        mutate(payload, {
            onSuccess: (hostel) => {
                toast.success(`Hostel "${hostel.name}" created.`);
                onSuccess?.(hostel.id);
            },
            onError: (err) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof CreateHostelFormValues, {
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
        <motion.div {...motionProps} className="space-y-6">
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
                        Cover image <span className="text-red-500">*</span>
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
                                hint="JPEG, PNG, WEBP — max 5 MB. Recommended: 1280×720px"
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
                        htmlFor="h-name"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Hostel name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="h-name"
                        placeholder="e.g. Valco Hall"
                        className={inputCls}
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
                        htmlFor="h-address"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="h-address"
                        placeholder="e.g. University of Cape Coast, Cape Coast"
                        className={inputCls}
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
                        htmlFor="h-description"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Description{' '}
                        <span className="text-gray-400 dark:text-gray-500">
                            (optional)
                        </span>
                    </Label>
                    <Textarea
                        id="h-description"
                        rows={3}
                        placeholder="Brief description of facilities, location highlights…"
                        className={`${inputCls} resize-none`}
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
                        htmlFor="h-gender"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Gender policy <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        onValueChange={(val) =>
                            setValue(
                                'genderPolicy',
                                val as CreateHostelFormValues['genderPolicy'],
                                { shouldValidate: true }
                            )
                        }
                    >
                        <SelectTrigger
                            id="h-gender"
                            className={cn(inputCls, 'w-56')}
                        >
                            <SelectValue placeholder="Select policy" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <SelectItem value="MALE_ONLY">Male Only</SelectItem>
                            <SelectItem value="FEMALE_ONLY">
                                Female Only
                            </SelectItem>
                            <SelectItem value="MIXED">Mixed</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.genderPolicy && (
                        <FieldError message={errors.genderPolicy.message!} />
                    )}
                </motion.div>

                {/* ── Coordinates (optional) ──────────────────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="h-lat"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Latitude{' '}
                            <span className="text-gray-400 dark:text-gray-500">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="h-lat"
                            type="number"
                            step="any"
                            placeholder="e.g. 5.1264"
                            className={inputCls}
                            {...register('latitude', { valueAsNumber: true })}
                        />
                        {errors.latitude && (
                            <FieldError message={errors.latitude.message!} />
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="h-lon"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Longitude{' '}
                            <span className="text-gray-400 dark:text-gray-500">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="h-lon"
                            type="number"
                            step="any"
                            placeholder="e.g. -1.2922"
                            className={inputCls}
                            {...register('longitude', { valueAsNumber: true })}
                        />
                        {errors.longitude && (
                            <FieldError message={errors.longitude.message!} />
                        )}
                    </div>
                </motion.div>

                {/* ── Manager ID (optional) ───────────────────────────── */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="h-manager"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Manager ID{' '}
                        <span className="text-gray-400 dark:text-gray-500">
                            (optional — assign after creation)
                        </span>
                    </Label>
                    <Controller
                        control={control}
                        name="managerId"
                        render={({ field: { value, onChange } }) => (
                            <Combobox
                                options={managerOptions}
                                placeholder={
                                    isManagersLoading
                                        ? 'Loading managers...'
                                        : 'Select manager'
                                }
                                onValueChange={onChange}
                                value={value}
                                disabled={isManagersLoading}
                                width="w-full"
                            />
                        )}
                    />
                    {errors.managerId && (
                        <FieldError message={errors.managerId.message!} />
                    )}
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
                        Create hostel
                    </Button>
                </motion.div>
            </form>
        </motion.div>
    );
}

// =============================================================================
// Shared internal helpers
// =============================================================================

/** Shared Tailwind classes for all text inputs in this form. */
const inputCls =
    'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600';
