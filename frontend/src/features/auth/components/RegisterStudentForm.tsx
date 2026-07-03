/* eslint-disable react-hooks/incompatible-library */
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, UserPlus, MailCheck, Send } from 'lucide-react';

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

import { useRegisterStudentMutation } from '../api/registration';
import { useResendVerificationMutation } from '../api/auth';
import {
    registerStudentSchema,
    type RegisterStudentFormValues,
} from '../types/registration';
import { PasswordInput } from './PasswordInput';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import type { ApiError } from '@/types/api';
import { transition } from '../utils/transition';

// ---------------------------------------------------------------------------
// Animation variants
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

/**
 * Student self-registration form.
 *
 * Flow:
 *  1. User fills in the form (validated with Zod via React Hook Form).
 *  2. On submit, `POST /api/users` is called.
 *
 * Field notes:
 *  - Phone is optional; an empty string is stripped before the API call.
 *  - `confirmPassword` is a frontend-only field — never sent to the API.
 *  - Password strength is shown live via {@link PasswordStrengthIndicator}.
 */

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RegisterStudentForm() {
    const navigate = useNavigate();
    const shouldReduceMotion = useReducedMotion();

    // Mutations
    const { mutate: registerStudent, isPending: isRegistering } =
        useRegisterStudentMutation();
    const { mutate: resendVerification, isPending: isResending } =
        useResendVerificationMutation();

    // Local State
    const [successEmail, setSuccessEmail] = useState<string | null>(null);
    const [resendCountdown, setResendCountdown] = useState(10);

    const {
        register,
        handleSubmit,
        watch,
        setError,
        formState: { errors },
    } = useForm<RegisterStudentFormValues>({
        resolver: zodResolver(registerStudentSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
            phone: '',
        },
    });

    const passwordValue = watch('password');

    // Timer logic for the Proactive Resend feature
    useEffect(() => {
        if (successEmail && resendCountdown > 0) {
            const timer = setTimeout(
                () => setResendCountdown((c) => c - 1),
                1000
            );
            return () => clearTimeout(timer);
        }
    }, [successEmail, resendCountdown]);

    const onSubmit = (data: RegisterStudentFormValues) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { confirmPassword: _, phone, ...rest } = data;
        const payload = { ...rest, ...(phone ? { phone } : {}) };

        registerStudent(payload, {
            onSuccess: (_, variables) => {
                // Transition to success view instead of immediate redirect
                setSuccessEmail(variables.email);
            },
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof RegisterStudentFormValues, {
                            type: 'server',
                            message: messages[0],
                        });
                    });
                }
            },
        });
    };

    const handleResend = () => {
        if (!successEmail) return;
        resendVerification(
            { email: successEmail },
            {
                onSuccess: () => setResendCountdown(120), // Reset to 120s to prevent spamming
            }
        );
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
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gray-200/60 blur-3xl dark:bg-gray-800/40" />
                <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-gray-300/40 blur-3xl dark:bg-gray-700/30" />
            </div>

            <motion.div {...motionProps} className="relative w-full max-w-lg">
                <Card className="overflow-hidden border-gray-200 bg-white/90 shadow-xl backdrop-blur-sm transition-colors duration-200 dark:border-gray-800 dark:bg-gray-950/90">
                    {/* --- SUCCESS STATE (PROACTIVE RESEND) --- */}
                    {successEmail ? (
                        <motion.div
                            initial={
                                shouldReduceMotion
                                    ? false
                                    : { opacity: 0, scale: 0.95 }
                            }
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center space-y-6 p-8 text-center"
                        >
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                <MailCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>

                            <div className="space-y-2">
                                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    Check your email
                                </CardTitle>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    We've sent a verification link to <br />
                                    <span className="font-medium text-gray-900 dark:text-gray-200">
                                        {successEmail}
                                    </span>
                                </p>
                            </div>

                            <div className="w-full space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleResend}
                                    disabled={
                                        resendCountdown > 0 || isResending
                                    }
                                >
                                    {isResending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="mr-2 h-4 w-4" />
                                    )}
                                    {resendCountdown > 0
                                        ? `Didn't receive it? Wait ${resendCountdown}s`
                                        : 'Resend verification email'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full"
                                    onClick={() => navigate('/login')}
                                >
                                    Back to login
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        /* --- REGISTRATION FORM --- */
                        <>
                            <CardHeader className="space-y-3 pb-6 text-center">
                                <motion.div
                                    variants={
                                        shouldReduceMotion ? {} : itemVariants
                                    }
                                >
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                        <UserPlus className="h-7 w-7 text-gray-700 dark:text-gray-300" />
                                    </div>
                                </motion.div>

                                <motion.div
                                    variants={
                                        shouldReduceMotion ? {} : itemVariants
                                    }
                                    className="space-y-1"
                                >
                                    <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                        Create your account
                                    </CardTitle>
                                    <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                                        Register to browse and book hostel
                                        accommodation
                                    </CardDescription>
                                </motion.div>
                            </CardHeader>

                            <CardContent className="pb-8">
                                <form
                                    onSubmit={handleSubmit(onSubmit)}
                                    className="space-y-4"
                                    noValidate
                                >
                                    {/* First name + Last name — side by side on sm+ */}

                                    <motion.div
                                        variants={
                                            shouldReduceMotion
                                                ? {}
                                                : itemVariants
                                        }

                                        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                                    >
                                        {/* First name */}

                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="firstName"

                                                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                            >
                                                First name
                                            </Label>

                                            <Input
                                                id="firstName"

                                                type="text"

                                                autoComplete="given-name"

                                                placeholder="John"

                                                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600"

                                                {...register('firstName')}
                                            />

                                            {errors.firstName && (
                                                <FieldError
                                                    message={
                                                        errors.firstName
                                                            .message!
                                                    }
                                                />
                                            )}
                                        </div>

                                        {/* Last name */}

                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="lastName"

                                                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                            >
                                                Last name
                                            </Label>

                                            <Input
                                                id="lastName"

                                                type="text"

                                                autoComplete="family-name"

                                                placeholder="Doe"

                                                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600"

                                                {...register('lastName')}
                                            />

                                            {errors.lastName && (
                                                <FieldError
                                                    message={
                                                        errors.lastName.message!
                                                    }
                                                />
                                            )}
                                        </div>
                                    </motion.div>

                                    {/* Email */}

                                    <motion.div
                                        variants={
                                            shouldReduceMotion
                                                ? {}
                                                : itemVariants
                                        }

                                        className="space-y-1.5"
                                    >
                                        <Label
                                            htmlFor="email"

                                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >
                                            Email address
                                        </Label>

                                        <Input
                                            id="email"

                                            type="email"

                                            autoComplete="email"

                                            placeholder="you@example.com"

                                            className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600"

                                            {...register('email')}
                                        />

                                        {errors.email && (
                                            <FieldError
                                                message={errors.email.message!}
                                            />
                                        )}
                                    </motion.div>

                                    {/* Phone — optional */}

                                    <motion.div
                                        variants={
                                            shouldReduceMotion
                                                ? {}
                                                : itemVariants
                                        }

                                        className="space-y-1.5"
                                    >
                                        <Label
                                            htmlFor="phone"

                                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >
                                            Phone number{' '}
                                            <span className="text-gray-400 dark:text-gray-500">
                                                (optional)
                                            </span>
                                        </Label>

                                        <Input
                                            id="phone"

                                            type="tel"

                                            autoComplete="tel"

                                            placeholder="+233 54 123 4567"

                                            className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600"

                                            {...register('phone')}
                                        />

                                        {errors.phone && (
                                            <FieldError
                                                message={errors.phone.message!}
                                            />
                                        )}
                                    </motion.div>

                                    {/* Password */}

                                    <motion.div
                                        variants={
                                            shouldReduceMotion
                                                ? {}
                                                : itemVariants
                                        }

                                        className="space-y-1.5"
                                    >
                                        <Label
                                            htmlFor="password"

                                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >
                                            Password
                                        </Label>

                                        <PasswordInput
                                            id="password"

                                            autoComplete="new-password"

                                            className="border-gray-200 bg-white text-gray-900 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus-visible:ring-gray-600"

                                            {...register('password')}
                                        />

                                        {/* Live strength meter */}

                                        <PasswordStrengthIndicator
                                            password={passwordValue}
                                        />

                                        {errors.password && (
                                            <FieldError
                                                message={
                                                    errors.password.message!
                                                }
                                            />
                                        )}
                                    </motion.div>

                                    {/* Confirm password */}

                                    <motion.div
                                        variants={
                                            shouldReduceMotion
                                                ? {}
                                                : itemVariants
                                        }

                                        className="space-y-1.5"
                                    >
                                        <Label
                                            htmlFor="confirmPassword"

                                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >
                                            Confirm password
                                        </Label>

                                        <PasswordInput
                                            id="confirmPassword"

                                            autoComplete="new-password"

                                            className="border-gray-200 bg-white text-gray-900 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus-visible:ring-gray-600"

                                            {...register('confirmPassword')}
                                        />

                                        {errors.confirmPassword && (
                                            <FieldError
                                                message={
                                                    errors.confirmPassword
                                                        .message!
                                                }
                                            />
                                        )}
                                    </motion.div>

                                    {/* I am rendering just the button part below to show the updated loading state */}
                                    <motion.div
                                        variants={
                                            shouldReduceMotion
                                                ? {}
                                                : itemVariants
                                        }
                                        className="pt-2"
                                    >
                                        <Button
                                            type="submit"
                                            disabled={isRegistering}
                                            className="w-full cursor-pointer bg-gray-900 font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                                        >
                                            {isRegistering ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Creating account…
                                                </>
                                            ) : (
                                                'Create account'
                                            )}
                                        </Button>
                                    </motion.div>
                                </form>

                                <motion.p
                                    variants={
                                        shouldReduceMotion ? {} : itemVariants
                                    }
                                    className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400"
                                >
                                    Already have an account?{' '}
                                    <Link
                                        to="/login"
                                        className="font-medium text-gray-900 underline-offset-2 hover:underline dark:text-gray-100"
                                    >
                                        Sign in
                                    </Link>
                                </motion.p>
                            </CardContent>
                        </>
                    )}
                </Card>

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
