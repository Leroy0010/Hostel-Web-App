import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    passwordResetRequestSchema,
    type PasswordResetRequestForm,
} from '../types';

import { useRequestPasswordResetMutation } from '../api/auth';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export function ForgotPasswordForm() {
    const shouldReduceMotion = useReducedMotion();

    const mutation = useRequestPasswordResetMutation();

    const {
        register,
        handleSubmit,
        setError,
        reset,
        formState: { errors },
    } = useForm<PasswordResetRequestForm>({
        resolver: zodResolver(passwordResetRequestSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = (data: PasswordResetRequestForm) => {
        mutation.mutate(data, {
            onSuccess: () => {
                reset();
            },
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof PasswordResetRequestForm, {
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
                                <Mail className="h-7 w-7 text-gray-700 dark:text-gray-300" />
                            </div>
                        </motion.div>

                        <motion.div
                            variants={shouldReduceMotion ? {} : itemVariants}
                        >
                            <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                Forgot Password
                            </CardTitle>

                            <CardDescription>
                                Enter your email address and we'll send you a
                                password reset link.
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
                                <Label htmlFor="email">Email Address</Label>

                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    {...register('email')}
                                />

                                {errors.email && (
                                    <FieldError
                                        message={errors.email.message!}
                                    />
                                )}
                            </motion.div>

                            <motion.div
                                variants={
                                    shouldReduceMotion ? {} : itemVariants
                                }
                            >
                                <Button
                                    type="submit"
                                    disabled={mutation.isPending}
                                    className="w-full"
                                >
                                    {mutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending reset link...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="mr-2 h-4 w-4" />
                                            Send Reset Link
                                        </>
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
