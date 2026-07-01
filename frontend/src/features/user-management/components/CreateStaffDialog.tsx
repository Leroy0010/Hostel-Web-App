/* eslint-disable react-hooks/incompatible-library */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FieldError } from '@/components/ui/FieldError';
import { useCreateStaff } from '../hooks/user-management.hooks';
import {
    createStaffSchema,
    type CreateStaffFormValues,
} from '../types/user-management.types';
import { transition } from '@/features/auth/utils/transition';

// =============================================================================
// Animation
// =============================================================================

const rowVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition },
};

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

// =============================================================================
// Props
// =============================================================================

interface CreateStaffDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Admin dialog for creating a new MANAGER or ADMIN staff account.
 *
 * Only MANAGER and ADMIN roles are selectable — students self-register
 * through the public registration flow and are never created here.
 *
 * On submit, the backend creates an inactive account and sends an activation
 * email so the new staff member can set their own password. The form does
 * not collect a password.
 *
 * @example
 * ```tsx
 * <CreateStaffDialog open={isOpen} onOpenChange={setIsOpen} />
 * ```
 */
export function CreateStaffDialog({
    open,
    onOpenChange,
}: CreateStaffDialogProps) {
    const { mutate: createStaff, isPending } = useCreateStaff();

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
        reset,
    } = useForm<CreateStaffFormValues>({
        resolver: zodResolver(createStaffSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            role: 'MANAGER',
        },
    });

    const handleClose = () => {
        reset();
        onOpenChange(false);
    };

    const onSubmit = (values: CreateStaffFormValues) => {
        createStaff(values, { onSuccess: handleClose });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
            <DialogContent className="border-gray-200 bg-white sm:max-w-md dark:border-gray-800 dark:bg-gray-950">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        Create Staff Account
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
                        An activation email will be sent so the new staff member
                        can set their own password.
                    </motion.p>

                    {/* Name fields */}
                    <motion.div
                        variants={rowVariants}
                        className="grid grid-cols-2 gap-3"
                    >
                        <div className="space-y-1.5">
                            <Label className="text-gray-700 dark:text-gray-300">
                                First Name
                            </Label>
                            <Input
                                {...register('firstName')}
                                placeholder="Kwame"
                                className="border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                            />
                            {errors.firstName && (
                                <FieldError
                                    message={errors.firstName.message!}
                                />
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-gray-700 dark:text-gray-300">
                                Last Name
                            </Label>
                            <Input
                                {...register('lastName')}
                                placeholder="Mensah"
                                className="border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                            />
                            {errors.lastName && (
                                <FieldError
                                    message={errors.lastName.message!}
                                />
                            )}
                        </div>
                    </motion.div>

                    {/* Email */}
                    <motion.div variants={rowVariants} className="space-y-1.5">
                        <Label className="text-gray-700 dark:text-gray-300">
                            Email Address
                        </Label>
                        <Input
                            type="email"
                            {...register('email')}
                            placeholder="kwame.mensah@example.com"
                            className="border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                        />
                        {errors.email && (
                            <FieldError message={errors.email.message!} />
                        )}
                    </motion.div>

                    {/* Phone */}
                    <motion.div variants={rowVariants} className="space-y-1.5">
                        <Label className="text-gray-700 dark:text-gray-300">
                            Phone Number
                        </Label>
                        <Input
                            type="tel"
                            {...register('phone')}
                            placeholder="0241234567"
                            className="border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                        />
                        {errors.phone && (
                            <FieldError message={errors.phone.message!} />
                        )}
                    </motion.div>

                    {/* Role */}
                    <motion.div variants={rowVariants} className="space-y-1.5">
                        <Label className="text-gray-700 dark:text-gray-300">
                            Role
                        </Label>
                        <Select
                            value={watch('role')}
                            onValueChange={(val) =>
                                setValue(
                                    'role',
                                    val as CreateStaffFormValues['role'],
                                    { shouldValidate: true }
                                )
                            }
                        >
                            <SelectTrigger className="border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                                <SelectItem value="MANAGER">Manager</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.role && (
                            <FieldError message={errors.role.message!} />
                        )}
                    </motion.div>

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
                            {isPending ? 'Creating…' : 'Create Account'}
                        </Button>
                    </motion.div>
                </motion.form>
            </DialogContent>
        </Dialog>
    );
}
