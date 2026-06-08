import { motion, useReducedMotion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { useCreateStaffMutation } from '../api/registration';
import {
    createStaffSchema,
    type CreateStaffFormValues,
} from '../types/registration';
import type { ApiError } from '@/types/api';
import { FieldError } from '@/components/ui/FieldError';
import { transition } from '../utils/transition';

// ---------------------------------------------------------------------------
// Animation variants (modal-appropriate — slightly tighter than page entrance)
// ---------------------------------------------------------------------------

const formVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            duration: 0.25,
            staggerChildren: 0.05,
        },
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreateStaffFormProps {
    /**
     * Called after a staff account has been successfully created.
     * Use this to close a parent dialog or navigate away.
     */
    onSuccess?: () => void;
    /**
     * Called when the user cancels the form.
     * Use this to close a parent dialog.
     */
    onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Admin-only staff account creation form.
 *
 * Key differences from student registration:
 *  - **No password field** — the backend sends a set-password invitation
 *    token to the new staff member's email address.
 *  - **Phone is required** — staff must be reachable.
 *  - **Role selector** — MANAGER or ADMIN only (STUDENT is rejected by the backend).
 *
 * Designed to be rendered inside a {@code <Dialog>} or a dedicated admin page.
 * Accepts {@link onSuccess} and {@link onCancel} callbacks for dialog integration.
 *
 * @example Inside a dialog:
 * ```tsx
 * <Dialog open={open} onOpenChange={setOpen}>
 *   <DialogContent>
 *     <CreateStaffForm
 *       onSuccess={() => setOpen(false)}
 *       onCancel={() => setOpen(false)}
 *     />
 *   </DialogContent>
 * </Dialog>
 * ```
 */
export function CreateStaffForm({ onSuccess, onCancel }: CreateStaffFormProps) {
    const { mutate, isPending } = useCreateStaffMutation();
    const shouldReduceMotion = useReducedMotion();

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        reset,
        formState: { errors },
    } = useForm<CreateStaffFormValues>({
        resolver: zodResolver(createStaffSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            role: undefined,
            
        },
    });

    const onSubmit = (data: CreateStaffFormValues) => {
        mutate(data, {
            onSuccess: () => {
                toast.success(
                    'Staff account created. An invitation email has been sent.'
                );
                reset();
                onSuccess?.();
            },
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof CreateStaffFormValues, {
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
        <motion.div {...motionProps} className="space-y-5">
            {/* Invitation notice */}
            <motion.div
                variants={shouldReduceMotion ? {} : rowVariants}
                className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300"
            >
                <Mail
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                />
                <p>
                    No password is required. The new staff member will receive
                    an email with a link to set their password.
                </p>
            </motion.div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
            >
                {/* First name + Last name */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="staff-firstName"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            First name
                        </Label>
                        <Input
                            id="staff-firstName"
                            type="text"
                            autoComplete="given-name"
                            placeholder="Jane"
                            className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600"
                            {...register('firstName')}
                        />
                        {errors.firstName && (
                            <FieldError message={errors.firstName.message!} />
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label
                            htmlFor="staff-lastName"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Last name
                        </Label>
                        <Input
                            id="staff-lastName"
                            type="text"
                            autoComplete="family-name"
                            placeholder="Smith"
                            className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600"
                            {...register('lastName')}
                        />
                        {errors.lastName && (
                            <FieldError message={errors.lastName.message!} />
                        )}
                    </div>
                </motion.div>

                {/* Email */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="staff-email"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Email address
                    </Label>
                    <Input
                        id="staff-email"
                        type="email"
                        autoComplete="email"
                        placeholder="staff@leroy.com"
                        className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600"
                        {...register('email')}
                    />
                    {errors.email && (
                        <FieldError message={errors.email.message!} />
                    )}
                </motion.div>

                {/* Phone — required for staff */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="staff-phone"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Phone number
                    </Label>
                    <Input
                        id="staff-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+233 54 123 4567"
                        className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600"
                        {...register('phone')}
                    />
                    {errors.phone && (
                        <FieldError message={errors.phone.message!} />
                    )}
                </motion.div>

                {/* Role */}
                <motion.div
                    variants={shouldReduceMotion ? {} : rowVariants}
                    className="space-y-1.5"
                >
                    <Label
                        htmlFor="staff-role"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Role
                    </Label>
                    {/*
                     * Shadcn's Select is not directly compatible with RHF's register().
                     * We use setValue via the onValueChange callback instead.
                     */}
                    <Select
                        onValueChange={(value) =>
                            setValue(
                                'role',
                                value as CreateStaffFormValues['role'],
                                { shouldValidate: true }
                            )
                        }
                    >
                        <SelectTrigger
                            id="staff-role"
                            className="border-gray-200 bg-white text-gray-900 focus:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-600"
                        >
                            <SelectValue placeholder="Select a role…" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <SelectItem
                                value="MANAGER"
                                className="cursor-pointer text-gray-900 focus:bg-gray-100 dark:text-gray-100 dark:focus:bg-gray-800"
                            >
                                Manager
                            </SelectItem>
                            <SelectItem
                                value="ADMIN"
                                className="cursor-pointer text-gray-900 focus:bg-gray-100 dark:text-gray-100 dark:focus:bg-gray-800"
                            >
                                Admin
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.role && (
                        <FieldError message={errors.role.message!} />
                    )}
                </motion.div>

                {/* Actions */}
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
                        className="cursor-pointer bg-gray-900 font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating account…
                            </>
                        ) : (
                            'Create staff account'
                        )}
                    </Button>
                </motion.div>
            </form>
        </motion.div>
    );
}

