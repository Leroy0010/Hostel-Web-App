import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ListOrdered } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FieldError } from '@/components/ui/FieldError';
import {
    useGetHostelWaitlistAvailablePeriods,
    useJoinWaitlist,
} from '../hooks/waitlist.hooks';
import {
    joinWaitlistSchema,
    type JoinWaitlistFormValues,
} from '../types/waitlist.types';
import { transition } from '@/features/auth/utils/transition';
import type { RoomType } from '@/features/room/types/room.types';
import { useMemo } from 'react';
import { Combobox } from '@/components/ui/my-combobox';
import type { Semester } from '@/features/booking/types/booking.types';

// =============================================================================
// Animation variants
// =============================================================================

const rowVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition },
};

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
};

// =============================================================================
// Props
// =============================================================================

interface JoinWaitlistDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Pre-fills the hostelId (required, from room context). */
    hostelId: string;
    /** Pre-fills the roomType if known (e.g. from the hostel detail page filters). */
    defaultRoomType?: RoomType;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Dialog allowing a student to join a hostel's waitlist.
 *
 * The form collects: roomType, academicYear, semester.
 * hostelId is always pre-filled from the parent context.
 * If defaultRoomType is provided (from the room's type), that field
 * is pre-selected but still editable — the student may want a different type.
 *
 * On success the dialog closes automatically and a toast confirms the position.
 *
 * @example
 * ```tsx
 * <JoinWaitlistDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   hostelId={hostelId}
 *   defaultRoomType="SINGLE"
 * />
 * ```
 */
export function JoinWaitlistDialog({
    open,
    onOpenChange,
    hostelId,
    defaultRoomType,
}: JoinWaitlistDialogProps) {
    const { mutate: join, isPending } = useJoinWaitlist();

    const {
        handleSubmit,
        control,
        formState: { errors },
        reset,
        watch,
        setValue,
    } = useForm<JoinWaitlistFormValues>({
        resolver: zodResolver(joinWaitlistSchema),
        defaultValues: {
            hostelId,
            roomType: defaultRoomType,
            academicYear: undefined, // default: current year
            semester: undefined,
        },
    });

    // eslint-disable-next-line react-hooks/incompatible-library
    const roomType = watch('roomType');

    const { data: availablePeriods = [] } =
        useGetHostelWaitlistAvailablePeriods(hostelId, roomType);

    const periodOptions = useMemo(
        () =>
            availablePeriods.map((period) => ({
                value: period.academicYear + '|' + period.semester,
                label: period.academicYear + ' | ' + period.semester,
            })),
        [availablePeriods]
    );

    const handleClose = () => {
        reset();
        onOpenChange(false);
    };

    const onSubmit = (values: JoinWaitlistFormValues) => {
        join(values, { onSuccess: handleClose });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
            <DialogContent className="border-gray-200 bg-white sm:max-w-md dark:border-gray-800 dark:bg-gray-950">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <ListOrdered className="h-4 w-4" aria-hidden="true" />
                        Join Waitlist
                    </DialogTitle>
                </DialogHeader>

                <motion.form
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4 pt-1"
                >
                    {/* Info callout */}
                    <motion.p
                        variants={rowVariants}
                        className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400"
                    >
                        You'll be automatically notified and given a booking
                        opportunity when a room of this type becomes available.
                    </motion.p>

                    {/* Room type */}
                    <motion.div variants={rowVariants} className="space-y-1.5">
                        <Label className="text-gray-700 dark:text-gray-300">
                            Room Type
                        </Label>
                        <Controller
                            control={control}
                            name="roomType"
                            render={({ field: { value, onChange } }) => (
                                <Select value={value} onValueChange={onChange}>
                                    <SelectTrigger className="border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select room type" />
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
                                    </SelectContent>
                                </Select>
                            )}
                        />

                        {errors.roomType && (
                            <FieldError message={errors.roomType.message!} />
                        )}
                    </motion.div>

                    <motion.div variants={rowVariants} className="space-y-1.5">
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
                                    placeholder="Select period"
                                    value={value}
                                    onValueChange={(val) => {
                                        onChange(val);
                                        const periodParts = (
                                            val as string
                                        ).split('|');
                                        setValue(
                                            'academicYear',
                                            periodParts[0]
                                        );
                                        setValue(
                                            'semester',
                                            periodParts[1] as Semester
                                        );
                                    }}
                                    options={periodOptions}
                                />
                            )}
                        />
                        {errors.selectedPeriodKey && (
                            <FieldError
                                message={errors.selectedPeriodKey.message!}
                            />
                        )}
                    </motion.div>

                    {/* Academic year */}
                    {/* <motion.div variants={rowVariants} className="space-y-1.5">
                        <Label className="text-gray-700 dark:text-gray-300">
                            Academic Year
                        </Label>
                        <Controller
                            control={control}
                            name="academicYear"
                            render={({ field: { onChange, value } }) => (
                                <Select value={value} onValueChange={onChange}>
                                    <SelectTrigger className="border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select academic year" />
                                    </SelectTrigger>
                                    <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                                        {availablePeriods.map((y) => (
                                            <SelectItem key={y} value={y}>
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />

                        {errors.academicYear && (
                            <FieldError
                                message={errors.academicYear.message!}
                            />
                        )}
                    </motion.div> */}

                    {/* Semester */}
                    {/* <motion.div variants={rowVariants} className="space-y-1.5">
                        <Label className="text-gray-700 dark:text-gray-300">
                            Semester
                        </Label>
                        <Controller
                            control={control}
                            name="semester"
                            render={({ field: { onChange, value } }) => (
                                <Select value={value} onValueChange={onChange}>
                                    <SelectTrigger className="border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select semester" />
                                    </SelectTrigger>
                                    <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                                        <SelectItem value="FIRST">
                                            First Semester
                                        </SelectItem>
                                        <SelectItem value="SECOND">
                                            Second Semester
                                        </SelectItem>
                                        <SelectItem value="FULL">
                                            Full Year
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.semester && (
                            <FieldError message={errors.semester.message!} />
                        )}
                    </motion.div> */}

                    {/* Actions */}
                    <motion.div
                        variants={rowVariants}
                        className="flex justify-end gap-2 pt-2"
                    >
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClose}
                            disabled={isPending}
                            className="text-gray-600 dark:text-gray-400"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                        >
                            {isPending ? 'Joining…' : 'Join Waitlist'}
                        </Button>
                    </motion.div>
                </motion.form>
            </DialogContent>
        </Dialog>
    );
}
