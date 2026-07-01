import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useLoginMutation } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';

import type { ApiError } from '@/types/api';
import type { LoginCredentials } from '../types';
import { loginSchema } from '../types';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/FieldError';

import { KeyRound } from 'lucide-react';
import { transition } from '../utils/transition';
import { PasswordInput } from './PasswordInput';

// ---------------------------------------------------------------------------
// Animation variants (aligned with RegisterStudentForm)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoginForm() {
    const { mutate, isPending } = useLoginMutation();
    const setAuth = useAuthStore((state) => state.setAuth);

    const navigate = useNavigate();
    const location = useLocation();
    const shouldReduceMotion = useReducedMotion();

    const from =
        (location.state as { from?: { pathname: string } })?.from?.pathname ??
        '/dashboard';

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<LoginCredentials>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = (data: LoginCredentials) => {
        mutate(data, {
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof LoginCredentials, {
                            type: 'server',
                            message: messages[0],
                        });
                    });
                }
            },
            onSuccess: (data) => {
                setAuth(data.token, data.user.user, data.user.hostel);
                navigate(from, { replace: true });
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
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 transition-colors duration-200 dark:bg-gray-900">
            {/* Background blobs */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gray-200/60 blur-3xl dark:bg-gray-800/40" />
                <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-gray-300/40 blur-3xl dark:bg-gray-700/30" />
            </div>

            <motion.div {...motionProps} className="relative w-full max-w-md">
                <Card className="border-gray-200 bg-white/90 shadow-xl backdrop-blur-sm transition-colors duration-200 dark:border-gray-800 dark:bg-gray-950/90">
                    {/* Header */}
                    <CardHeader className="space-y-3 pb-6 text-center">
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
                            <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                Welcome back
                            </CardTitle>

                            <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                                Sign in to manage your accommodation
                            </CardDescription>
                        </motion.div>
                    </CardHeader>

                    {/* Form */}
                    <CardContent className="pb-8">
                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="space-y-4"
                            noValidate
                        >
                            {/* Email */}
                            <motion.div
                                variants={
                                    shouldReduceMotion ? {} : itemVariants
                                }
                                className="space-y-1.5"
                            >
                                <Label htmlFor="email">Email address</Label>
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

                            {/* Password */}
                            <motion.div
                                variants={
                                    shouldReduceMotion ? {} : itemVariants
                                }
                                className="space-y-1.5"
                            >
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    {...register('password')}
                                    autoComplete="current-password"
                                    id="password"
                                />

                                <Link
                                    to="/forgot-password"
                                    className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                >
                                    Forgot password?
                                </Link>

                                {errors.password && (
                                    <FieldError
                                        message={errors.password.message!}
                                    />
                                )}
                            </motion.div>

                            {/* Submit */}
                            <motion.div
                                variants={
                                    shouldReduceMotion ? {} : itemVariants
                                }
                            >
                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign in'
                                    )}
                                </Button>
                            </motion.div>
                        </form>

                        {/* Register link */}
                        <motion.p
                            variants={shouldReduceMotion ? {} : itemVariants}
                            className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                            Don&apos;t have an account?{' '}
                            <Link
                                to="/register"
                                className="font-medium text-gray-900 underline-offset-2 hover:underline dark:text-gray-100"
                            >
                                Register
                            </Link>
                        </motion.p>
                    </CardContent>
                </Card>

                {/* Footer */}
                <motion.p
                    variants={shouldReduceMotion ? {} : itemVariants}
                    className="mt-4 text-center text-xs text-gray-400 dark:text-gray-600"
                >
                    Hostel Management System · University of Cape Coast
                </motion.p>
            </motion.div>
        </div>
    );
}
