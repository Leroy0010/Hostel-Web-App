import { useReducedMotion, motion } from 'framer-motion';
import { Loader2, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    passwordResetConfirmSchema,
    type PasswordResetConfirmForm,
} from '../types';

import { useConfirmPasswordResetMutation } from '../api/auth';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { PasswordInput } from './PasswordInput';
import { FieldError } from '@/components/ui/FieldError';

import type { ApiError } from '@/types/api';
import { transition } from '../utils/transition';

const containerVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition,
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition,
    },
};

interface Props {
    token: string;
    type: 'activation' | 'reset';
}

export function ResetPasswordForm({ token, type }: Props) {
    const shouldReduceMotion = useReducedMotion();

    const mutation = useConfirmPasswordResetMutation();

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<PasswordResetConfirmForm>({
        resolver: zodResolver(passwordResetConfirmSchema),
        defaultValues: {
            token,
            newPassword: '',
            type,
        },
    });

    const onSubmit = (data: PasswordResetConfirmForm) => {
        mutation.mutate(data, {
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof PasswordResetConfirmForm, {
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
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 py-12 transition-colors duration-200 dark:bg-gray-900">
            {/* Decorative blobs */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gray-200/60 blur-3xl dark:bg-gray-800/40" />
                <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-gray-300/40 blur-3xl dark:bg-gray-700/30" />
            </div>

            <motion.div {...motionProps} className="relative w-full max-w-md">
                <Card className="border-gray-200 bg-white/90 shadow-xl backdrop-blur-sm transition-colors duration-200 dark:border-gray-800 dark:bg-gray-950/90">
                    <CardHeader className="space-y-3 text-center">
                        <motion.div
                            variants={shouldReduceMotion ? {} : itemVariants}
                        >
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                <KeyRound className="h-7 w-7 text-gray-700 dark:text-gray-300" />
                            </div>
                        </motion.div>

                        <motion.div
                            variants={shouldReduceMotion ? {} : itemVariants}
                        >
                            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {type === 'reset'
                                    ? 'Reset Password'
                                    : 'Activate Account'}
                            </CardTitle>

                            <CardDescription>
                                {type === 'reset'
                                    ? 'Choose a new password for your account.'
                                    : 'Create your password to activate your account.'}
                            </CardDescription>
                        </motion.div>
                    </CardHeader>

                    <CardContent>
                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="space-y-4"
                            noValidate
                        >
                            <motion.div
                                variants={
                                    shouldReduceMotion ? {} : itemVariants
                                }
                                className="space-y-1.5"
                            >
                                <Label htmlFor="newPassword">
                                    New Password
                                </Label>

                                <PasswordInput
                                    id="newPassword"
                                    autoComplete="new-password"
                                    {...register('newPassword')}
                                />

                                {errors.newPassword && (
                                    <FieldError
                                        message={errors.newPassword.message!}
                                    />
                                )}
                            </motion.div>

                            <motion.div
                                variants={
                                    shouldReduceMotion ? {} : itemVariants
                                }
                                className="pt-2"
                            >
                                <Button
                                    type="submit"
                                    disabled={mutation.isPending}
                                    className="w-full"
                                >
                                    {mutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                                            {type === 'reset'
                                                ? 'Resetting Password...'
                                                : 'Activating Account...'}
                                        </>
                                    ) : type === 'reset' ? (
                                        'Reset Password'
                                    ) : (
                                        'Activate Account'
                                    )}
                                </Button>
                            </motion.div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
