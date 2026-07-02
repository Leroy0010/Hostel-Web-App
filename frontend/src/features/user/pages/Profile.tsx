import { useState, useRef } from 'react';
import { useReducedMotion, motion } from 'framer-motion';
import {
    Loader2,
    User,
    Calendar,
    Shield,
    Building,
    Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileTab } from '../components/ProfileTab';
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm';
import { transition } from '@/features/auth/utils/transition';
import {
    useGetCurrentProfile,
    useUpdateProfileUrlMutation,
} from '@/features/user/hooks/user.hooks';

const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition },
};

export default function Profile() {
    const { data: response, isLoading, isError } = useGetCurrentProfile();
    const { mutate: updateProfileUrl, isPending: isUpdatingUrl } =
        useUpdateProfileUrlMutation();
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
            <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-900/50 dark:bg-red-900/20">
                Failed to load account settings. Please try again later.
            </div>
        );
    }

    const { user, hostel } = response;
    const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
    });
    const canEdit = user.role === 'ADMIN' || user.role === 'STUDENT';

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
            const uploadedUrl = URL.createObjectURL(file);
            updateProfileUrl({ profileUrl: uploadedUrl });
            toast.success('Avatar updated successfully');
        } catch {
            toast.error('Failed to upload image.');
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 px-4 py-8 transition-colors duration-200 dark:bg-gray-950">
            <motion.div
                {...motionProps}
                className="mx-auto max-w-md overflow-hidden rounded-[40px] bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800"
            >
                {/* ── Master Card Curved Pink Header ────────────────── */}
                <div className="bg-[#fdf2f8] px-6 pt-8 pb-8 dark:bg-pink-950/20">
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-sm dark:border-gray-900 dark:bg-gray-900">
                                {isUploadingImage || isUpdatingUrl ? (
                                    <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                                ) : user.profileUrl ? (
                                    <img
                                        src={user.profileUrl}
                                        alt={user.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <User className="h-12 w-12 text-gray-300" />
                                )}
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/jpeg, image/png, image/webp"
                                onChange={handleAvatarChange}
                                disabled={
                                    !canEdit ||
                                    isUploadingImage ||
                                    isUpdatingUrl
                                }
                            />

                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    disabled={isUploadingImage || isUpdatingUrl}
                                    className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-sm ring-4 ring-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 dark:ring-gray-900"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <h2 className="mt-5 text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Hello, {user.name.split(' ')[0]}!
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                        </p>
                    </div>
                </div>

                {/* ── 3-Column Profile Statistics Row ────────────────── */}
                <div className="flex justify-between border-b border-gray-50 px-8 py-6 dark:border-gray-800/50">
                    <div className="flex flex-col items-center">
                        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#fdf2f8] text-[#e879f9] dark:bg-pink-950/30">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {joinedDate}
                        </span>
                        <span className="mt-0.5 text-[11px] font-medium tracking-wider text-gray-400 uppercase">
                            Joined
                        </span>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#fdf2f8] text-[#e879f9] dark:bg-pink-950/30">
                            <Shield className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-bold text-gray-900 capitalize dark:text-gray-100">
                            {user.role.toLowerCase()}
                        </span>
                        <span className="mt-0.5 text-[11px] font-medium tracking-wider text-gray-400 uppercase">
                            Account
                        </span>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#fdf2f8] text-[#e879f9] dark:bg-pink-950/30">
                            <Building className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {hostel ? 'Assigned' : 'None'}
                        </span>
                        <span className="mt-0.5 text-[11px] font-medium tracking-wider text-gray-400 uppercase">
                            Hostel
                        </span>
                    </div>
                </div>

                {/* ── Tab View Content Router ────────────────────────── */}
                <Tabs defaultValue="profile" className="w-full p-6">
                    <TabsList className="mb-6 grid w-full grid-cols-2 rounded-2xl bg-gray-100/80 p-1 dark:bg-gray-800/50">
                        <TabsTrigger
                            value="profile"
                            className="rounded-xl py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-gray-100"
                        >
                            Profile
                        </TabsTrigger>
                        <TabsTrigger
                            value="security"
                            className="rounded-xl py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-gray-100"
                        >
                            Security
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent
                        value="profile"
                        className="mt-0 focus-visible:outline-none"
                    >
                        <ProfileTab
                            data={response}
                            isLoading={isLoading}
                            isError={isError}
                        />
                    </TabsContent>

                    <TabsContent
                        value="security"
                        className="mt-0 focus-visible:outline-none"
                    >
                        <ChangePasswordForm />
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    );
}
