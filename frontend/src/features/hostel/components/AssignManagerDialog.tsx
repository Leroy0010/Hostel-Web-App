import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, UserCheck } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import { useAssignManager, useUnassignManager } from '../hooks/hostel.hooks';
import {
    assignManagerSchema,
    type AssignManagerFormValues,
    type HostelDto,
} from '../types/hostel.types';
import type { ApiError } from '@/types/api';
import { Combobox } from '@/components/ui/my-combobox';
import { useGetManagers } from '@/features/user/hooks/user.hooks';
import { useMemo } from 'react';

// =============================================================================
// Props
// =============================================================================

interface AssignManagerDialogProps {
    /** Controls dialog visibility. */
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /**
     * The hostel being modified.
     * Used to display context and to determine whether an "Unassign" action
     * should be offered (when {@code hostel.manager} is non-null).
     */
    hostel: HostelDto;
    /** Called with the updated hostel after a successful assign or unassign. */
    onSuccess?: (hostel: HostelDto) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Dialog for assigning or replacing the manager of a hostel.
 *
 * Behaviour:
 *  - If the hostel currently has a manager, their details are shown and the
 *    user can either enter a new manager UUID (replace) or click "Remove manager".
 *  - If there is no current manager, only the assign input is shown.
 *
 * The manager UUID input is validated against a UUID v4 regex before submission.
 * Server-side validation errors are mapped back onto the form field.
 *
 * Uses Shadcn {@code <Dialog>} with a Framer Motion scale entrance / exit so
 * the animation matches the project's modal animation standard (§7 of agent2.md).
 */
export function AssignManagerDialog({
    open,
    onOpenChange,
    hostel,
    onSuccess,
}: AssignManagerDialogProps) {
    const { mutate: assign, isPending: isAssigning } = useAssignManager(
        hostel.id
    );
    const { mutate: unassign, isPending: isUnassigning } = useUnassignManager(
        hostel.id
    );

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

    const isPending = isAssigning || isUnassigning;

    const {
        handleSubmit,
        setError,
        reset,
        control,
        formState: { errors },
    } = useForm<AssignManagerFormValues>({
        resolver: zodResolver(assignManagerSchema),
        defaultValues: { managerId: '' },
    });

    const handleAssign = (data: AssignManagerFormValues) => {
        assign(
            { managerId: data.managerId },
            {
                onSuccess: (updated) => {
                    reset();
                    onSuccess?.(updated);
                    onOpenChange(false);
                },
                onError: (err: ApiError) => {
                    if (err.code === 'VALIDATION_FAILED' && err.details) {
                        Object.entries(err.details).forEach(
                            ([field, messages]) => {
                                setError(
                                    field as keyof AssignManagerFormValues,
                                    {
                                        type: 'server',
                                        message: messages[0],
                                    }
                                );
                            }
                        );
                    }
                },
            }
        );
    };

    const handleUnassign = () => {
        unassign(undefined, {
            onSuccess: (updated) => {
                onSuccess?.(updated);
                onOpenChange(false);
            },
        });
    };

    const handleClose = () => {
        if (!isPending) {
            reset();
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <AnimatePresence>
                {open && (
                    <DialogContent
                        forceMount
                        className="border-gray-200 bg-white sm:max-w-lg dark:border-gray-800 dark:bg-gray-950"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{
                                duration: 0.25,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                        >
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                    <UserCheck className="h-5 w-5 text-gray-500" />
                                    Assign Manager
                                </DialogTitle>
                                <DialogDescription className="text-gray-500 dark:text-gray-400">
                                    Assign a manager to{' '}
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        {hostel.name}
                                    </span>
                                </DialogDescription>
                            </DialogHeader>

                            {/* Current manager info */}
                            {hostel.manager && (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                                    <p className="text-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                                        Current manager
                                    </p>
                                    <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                                        {hostel.manager.firstName}{' '}
                                        {hostel.manager.lastName}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {hostel.manager.email}
                                    </p>
                                </div>
                            )}

                            {/* Assign form */}
                            <form
                                onSubmit={handleSubmit(handleAssign)}
                                className="space-y-4"
                                noValidate
                            >
                                {' '}
                                {!isManagersLoading && (
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="am-managerId"
                                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >
                                            {hostel.manager
                                                ? 'New manager'
                                                : 'Manager'}
                                        </Label>
                                        <Controller
                                            control={control}
                                            name="managerId"
                                            render={({
                                                field: { value, onChange },
                                            }) => (
                                                <Combobox
                                                    options={managerOptions}
                                                    placeholder="Select manager"
                                                    onValueChange={onChange}
                                                    value={value}
                                                    disabled={isAssigning}
                                                    width="w-full"
                                                />
                                            )}
                                        />
                                        {errors.managerId && (
                                            <p className="text-xs font-medium text-red-500 dark:text-red-400">
                                                {errors.managerId.message}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {/* Action buttons */}
                                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-between">
                                    {/* Unassign — only shown when a manager exists */}
                                    {hostel.manager ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleUnassign}
                                            disabled={isPending}
                                            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/30"
                                        >
                                            {isUnassigning && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            Remove manager
                                        </Button>
                                    ) : (
                                        /* Spacer to keep assign button right-aligned */
                                        <div />
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleClose}
                                            disabled={isPending}
                                            className="border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isPending}
                                            className="bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                                        >
                                            {isAssigning && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            {hostel.manager
                                                ? 'Replace'
                                                : 'Assign'}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </DialogContent>
                )}
            </AnimatePresence>
        </Dialog>
    );
}
