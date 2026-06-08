import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useReducedMotion, motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';

import {
    changePasswordSchema,
    type ChangePasswordForm as FormValues,
} from '../types';
import { useChangePasswordMutation } from '../api/auth';
import { PasswordInput } from './PasswordInput';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { FieldError } from '@/components/ui/FieldError';
import type { ApiError } from '@/types/api';
import { transition } from '../utils/transition';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition },
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition },
};

export function ChangePasswordForm() {
    const { mutate, isPending } = useChangePasswordMutation();
    const shouldReduceMotion = useReducedMotion();

    const {
        register,
        handleSubmit,
        reset,
        setError,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
        },
    });

    // Watch new password for live strength indicator
    // eslint-disable-next-line react-hooks/incompatible-library
    const newPasswordValue = watch('newPassword');

    const onSubmit = (data: FormValues) => {
        mutate(data, {
            onSuccess: () => {
                reset();
            },
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof FormValues, {
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
        : {
              variants: containerVariants,
              initial: 'hidden',
              animate: 'visible',
          };

    return (
        <motion.div {...motionProps} className="flex w-full justify-center">
            <Card className="w-full max-w-md border-gray-200 bg-white/90 shadow-sm backdrop-blur-sm transition-colors duration-200 dark:border-gray-800 dark:bg-gray-950/90">
                <CardHeader className="space-y-3 pb-6">
                    <motion.div
                        variants={shouldReduceMotion ? {} : itemVariants}
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                            <ShieldCheck className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                        </div>
                    </motion.div>

                    <motion.div
                        variants={shouldReduceMotion ? {} : itemVariants}
                        className="space-y-1"
                    >
                        <CardTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                            Update Password
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                            Ensure your account is using a long, random password
                            to stay secure.
                        </CardDescription>
                    </motion.div>
                </CardHeader>

                <CardContent>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-5"
                        noValidate
                    >
                        <motion.div
                            variants={shouldReduceMotion ? {} : itemVariants}
                            className="max-w-md space-y-1.5"
                        >
                            <Label
                                htmlFor="currentPassword"
                                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Current Password
                            </Label>
                            <PasswordInput
                                id="currentPassword"
                                autoComplete="current-password"
                                className="border-gray-200 bg-white text-gray-900 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus-visible:ring-gray-600"
                                {...register('currentPassword')}
                            />
                            {errors.currentPassword && (
                                <FieldError
                                    message={errors.currentPassword.message!}
                                />
                            )}
                        </motion.div>

                        <motion.div
                            variants={shouldReduceMotion ? {} : itemVariants}
                            className="max-w-md space-y-1.5"
                        >
                            <Label
                                htmlFor="newPassword"
                                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                New Password
                            </Label>
                            <PasswordInput
                                id="newPassword"
                                autoComplete="new-password"
                                className="border-gray-200 bg-white text-gray-900 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus-visible:ring-gray-600"
                                {...register('newPassword')}
                            />
                            {/* Live strength meter */}
                            <PasswordStrengthIndicator
                                password={newPasswordValue}
                            />
                            {errors.newPassword && (
                                <FieldError
                                    message={errors.newPassword.message!}
                                />
                            )}
                        </motion.div>

                        <motion.div
                            variants={shouldReduceMotion ? {} : itemVariants}
                            className="pt-2"
                        >
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-gray-900 font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating Password...
                                    </>
                                ) : (
                                    'Change Password'
                                )}
                            </Button>
                        </motion.div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}
