import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, User, Building, MapPin } from 'lucide-react';
import { useReducedMotion, motion } from 'framer-motion';
import { toast } from 'sonner';

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

import { transition } from '@/features/auth/utils/transition';
import {
    useUpdateProfileMutation,
} from '@/features/user/hooks/user.hooks';
import type { ApiError } from '@/types/api';
import type { MeResponse } from '../types/user.types';

// 1. Updated Schema to match backend DTO
const updateProfileSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: z.string().optional(),
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition },
};

interface ProfileTabProps {
    data?: NoInfer<MeResponse>;
    isLoading: boolean;
    isError: boolean;
}

export function ProfileTab({
    data: response,
    isLoading,
    isError,
}: ProfileTabProps) {
    const { mutate: updateProfile, isPending: isUpdating } =
        useUpdateProfileMutation();
    const [isEditing, setIsEditing] = useState(false);
    const shouldReduceMotion = useReducedMotion();

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isDirty },
    } = useForm<UpdateProfileValues>({
        resolver: zodResolver(updateProfileSchema),
    });

    // 2. Map backend response to separate fields
    useEffect(() => {
        if (response?.user) {
            const name = response.user.name.split(' ');
            reset({
                firstName: name[0],
                lastName: name[1],
                phone: response.user.phone || '',
            });
        }
    }, [response, reset]);

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    if (isError || !response) {
        return (
            <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20">
                <CardContent className="pt-6 text-center text-red-600 dark:text-red-400">
                    Failed to load profile data. Please try again.
                </CardContent>
            </Card>
        );
    }

    const { user, hostel } = response;
    const canEdit = user.role === 'ADMIN' || user.role === 'STUDENT';

    const onSubmit = (data: UpdateProfileValues) => {
        updateProfile(data, {
            onSuccess: () => {
                toast.success('Profile updated successfully');
                setIsEditing(false);
            },
            onError: (err: ApiError) => {
                if (err.code === 'VALIDATION_FAILED' && err.details) {
                    Object.entries(err.details).forEach(([field, messages]) => {
                        setError(field as keyof UpdateProfileValues, {
                            type: 'server',
                            message: messages[0],
                        });
                    });
                }
            },
        });
    };

    return (
        <div className="space-y-6">
            <Card className="border-gray-200 bg-white/90 shadow-sm backdrop-blur-sm transition-colors duration-200 dark:border-gray-800 dark:bg-gray-950/90">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                            <User className="h-5 w-5" />
                            Personal Details
                        </CardTitle>
                        <CardDescription className="text-gray-500 dark:text-gray-400">
                            {user.role} Account • Joined{' '}
                            {new Date(user.createdAt).toLocaleDateString()}
                        </CardDescription>
                    </div>
                    {canEdit && !isEditing && (
                        <Button
                            variant="outline"
                            onClick={() => setIsEditing(true)}
                        >
                            Edit Profile
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        {/* 3. Replaced 2-col grid with a unified grid for all fields */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* First Name */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="firstName"
                                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                    First Name
                                </Label>
                                <Input
                                    id="firstName"
                                    disabled={!isEditing}
                                    className="disabled:bg-gray-50 disabled:opacity-75 dark:disabled:bg-gray-900"
                                    {...register('firstName')}
                                />
                                {errors.firstName && (
                                    <FieldError
                                        message={errors.firstName.message!}
                                    />
                                )}
                            </div>

                            {/* Last Name */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="lastName"
                                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                    Last Name
                                </Label>
                                <Input
                                    id="lastName"
                                    disabled={!isEditing}
                                    className="disabled:bg-gray-50 disabled:opacity-75 dark:disabled:bg-gray-900"
                                    {...register('lastName')}
                                />
                                {errors.lastName && (
                                    <FieldError
                                        message={errors.lastName.message!}
                                    />
                                )}
                            </div>

                            {/* Email - Spans 1 column but you can make it span full width if preferred */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="email"
                                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    disabled
                                    value={user.email}
                                    className="bg-gray-50 opacity-75 dark:bg-gray-900"
                                    title="Email cannot be changed"
                                />
                            </div>

                            {/* Phone */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="phone"
                                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                    Phone Number
                                </Label>
                                <Input
                                    id="phone"
                                    disabled={!isEditing}
                                    placeholder="No phone number provided"
                                    className="disabled:bg-gray-50 disabled:opacity-75 dark:disabled:bg-gray-900"
                                    {...register('phone')}
                                />
                                {errors.phone && (
                                    <FieldError
                                        message={errors.phone.message!}
                                    />
                                )}
                            </div>
                        </div>

                        {isEditing && (
                            <motion.div
                                variants={
                                    shouldReduceMotion ? {} : itemVariants
                                }
                                initial="hidden"
                                animate="visible"
                                className="flex justify-end gap-3 pt-4"
                            >
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        setIsEditing(false);
                                        reset();
                                    }}
                                    disabled={isUpdating}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!isDirty || isUpdating}
                                >
                                    {isUpdating && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Save Changes
                                </Button>
                            </motion.div>
                        )}
                    </form>
                </CardContent>
            </Card>

            {hostel && (
                <motion.div
                    variants={shouldReduceMotion ? {} : itemVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <Card className="overflow-hidden border-gray-200 bg-white/90 shadow-sm backdrop-blur-sm transition-colors duration-200 dark:border-gray-800 dark:bg-gray-950/90">
                        <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4 dark:border-gray-800/50 dark:bg-gray-900/50">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                <Building className="h-5 w-5" />
                                Current Accommodation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-start gap-6 sm:flex-row">
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                            {hostel.name}
                                        </h3>
                                        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                            <MapPin className="h-4 w-4" />
                                            {hostel.address}
                                        </p>
                                    </div>
                                    {/* <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <p className="text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                                Gender Policy
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {hostel.genderPolicy.replace(
                                                    '_',
                                                    ' '
                                                )}
                                            </p>
                                        </div>
                                        {hostel.manager && (
                                            <div>
                                                <p className="text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                                    Manager
                                                </p>
                                                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {hostel.manager.firstName}{' '}
                                                    {hostel.manager.lastName}
                                                </p>
                                            </div>
                                        )}
                                    </div> */}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}
