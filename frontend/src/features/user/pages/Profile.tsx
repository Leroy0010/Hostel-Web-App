// src/features/profile/components/ProfilePage.tsx

import { useReducedMotion, motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileTab } from '../components/ProfileTab';
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm';
import { transition } from '@/features/auth/utils/transition';

const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition },
};

export default function Profile() {
    const shouldReduceMotion = useReducedMotion();
    const motionProps = shouldReduceMotion
        ? {}
        : { variants: pageVariants, initial: 'hidden', animate: 'visible' };

    return (
        <div className="bg-gray-50 transition-colors duration-200 dark:bg-gray-900">
            <motion.div
                {...motionProps}
                className="mx-auto max-w-4xl space-y-8"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        Account Settings
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Manage your profile information and security
                        preferences.
                    </p>
                </div>

                <Tabs defaultValue="profile" className="w-full">
                    {/* Full width divided into two */}
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
                        <ProfileTab />
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
