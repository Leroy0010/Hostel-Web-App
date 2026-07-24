import { useState, useRef } from 'react';
import { useReducedMotion, motion } from 'framer-motion';
import { Loader2, User, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileTab } from '../components/ProfileTab';
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm';
import { transition } from '@/features/auth/utils/transition';
import {
    useGetCurrentProfile,
    useUpdateProfileUrlMutation,
} from '@/features/user/hooks/user.hooks';
import { handleUploadImage } from '@/services/cloudinary.service';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition },
};

export default function Profile() {
    const { data: response, isLoading, isError } = useGetCurrentProfile();
    const { mutate: updateProfileUrl, isPending: isUpdatingUrl } =
        useUpdateProfileUrlMutation();

    const setUser = useAuthStore((state) => state.setUser);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const shouldReduceMotion = useReducedMotion();
    const motionProps = shouldReduceMotion
        ? {}
        : { variants: pageVariants, initial: 'hidden', animate: 'visible' };

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            </div>
        );
    }

    if (isError || !response) {
        return (
            <div className="mx-auto mt-8 max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-900/50 dark:bg-red-900/20">
                Failed to load account settings. Please try again later.
            </div>
        );
    }

    const { user } = response;

    const handleAvatarChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            return toast.error('Image must be less than 5MB');
        }

        try {
            setIsUploadingImage(true);
            // Connect to your file upload service (e.g., S3 presigned URL handler) here
            const uploadedUrl = await handleUploadImage(file, 'profiles');

            updateProfileUrl({ profileUrl: uploadedUrl });
            setUser({ ...user, profileUrl: uploadedUrl });
            toast.success('Avatar updated successfully');
        } catch {
            toast.error('Failed to upload image.');
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8 transition-colors duration-200 dark:bg-gray-900">
            <motion.div
                {...motionProps}
                className="mx-auto max-w-4xl space-y-8"
            >
                {/* ── Consolidated Top Header ────────────────── */}
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-5">
                        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
                            {isUploadingImage || isUpdatingUrl ? (
                                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                            ) : user.profileUrl ? (
                                <img
                                    src={user.profileUrl}
                                    alt={user.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <User className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                            )}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/jpeg, image/png, image/webp"
                            onChange={handleAvatarChange}
                            disabled={isUploadingImage || isUpdatingUrl}
                        />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingImage || isUpdatingUrl}
                            className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-sm ring-4 ring-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 dark:ring-gray-900"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                            Hello, {user.name.split(' ')[0]}!
                        </h1>
                        <p className="mt-1 text-gray-500 dark:text-gray-400">
                            {user.email}
                        </p>
                    </div>
                </div>

                {/* ── Tab View Content Router ────────────────────────── */}
                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="w-full flex-row bg-gray-200/50 dark:bg-gray-800/50">
                        <TabsTrigger
                            value="profile"
                            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-950 dark:data-[state=active]:text-gray-100"
                        >
                            Profile Information
                        </TabsTrigger>
                        <TabsTrigger
                            value="security"
                            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-950 dark:data-[state=active]:text-gray-100"
                        >
                            Security
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent
                        value="profile"
                        className="mt-4 focus-visible:outline-none"
                    >
                        <ProfileTab
                            data={response}
                            isLoading={isLoading}
                            isError={isError}
                        />
                    </TabsContent>

                    <TabsContent
                        value="security"
                        className="mt-4 focus-visible:outline-none"
                    >
                        <ChangePasswordForm />
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    );
}
