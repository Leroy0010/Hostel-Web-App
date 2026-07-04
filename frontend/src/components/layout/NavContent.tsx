import { LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useLogoutMutation } from '@/features/auth/api/auth';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { navigation } from './navigation';
import type { UserRole } from '@/features/user/types/user.types';

export interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    roles?: UserRole[];
}

interface NavContentProps {
    onItemClick?: () => void;
    isCollapsed?: boolean;
}

const textVariants = {
    hidden: { opacity: 0, width: 0, transition: { duration: 0.2 } },
    visible: {
        opacity: 1,
        width: 'auto',
        transition: { duration: 0.2, delay: 0.1 },
    },
};

export function NavContent({
    onItemClick,
    isCollapsed = false,
}: NavContentProps) {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isInitialized = useAuthStore((state) => state.isInitialized); // Add this
    const navigate = useNavigate();
    const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();

    // ── 1. Skeleton Loading State ─────────────────────────────────────────
    if (!isInitialized) {
        return (
            <div className="flex h-full flex-col gap-4 overflow-hidden">
                {/* Skeleton Nav Links */}
                <nav className="flex-1 space-y-1 px-2 py-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className={`h-10 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800 ${
                                isCollapsed ? 'mx-auto w-10' : 'w-full'
                            }`}
                        />
                    ))}
                </nav>

                {/* Skeleton User Profile & Logout */}
                <div className="space-y-2 border-t border-gray-200 p-3 dark:border-gray-800">
                    <div
                        className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-3 py-2'}`}
                    >
                        <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                        {!isCollapsed && (
                            <div className="ml-3 h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                        )}
                    </div>
                    <div
                        className={`h-9 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800 ${
                            isCollapsed ? 'mx-auto w-full' : 'w-full'
                        }`}
                    />
                </div>
            </div>
        );
    }

    // ── 2. Normal Render Logic (Runs after init) ──────────────────────────
    const visibleItems = navigation(isAuthenticated).filter(
        (item) => (user && item.roles?.includes(user.role)) || !item.roles
    );

    const handleLogout = () => {
        logout(undefined, {
            onSettled: () => navigate('/login', { replace: true }),
        });
    };

    return (
        <div className="flex h-full flex-col gap-4 overflow-hidden">
            {/* ── Navigation Links ───────────────────────────────────────── */}
            <nav className="flex-1 scrollbar-none space-y-1 overflow-x-hidden overflow-y-auto px-2">
                {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={onItemClick}
                            title={isCollapsed ? item.name : undefined}
                            className={({ isActive }) =>
                                [
                                    'group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                                    isActive
                                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white',
                                    isCollapsed ? 'justify-center' : '',
                                ].join(' ')
                            }
                        >
                            <Icon
                                className={`h-5 w-5 shrink-0 transition-colors ${
                                    isCollapsed ? '' : 'mr-3'
                                } text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-white`}
                                aria-hidden="true"
                            />
                            <AnimatePresence initial={false}>
                                {!isCollapsed && (
                                    <motion.span
                                        variants={textVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="hidden"
                                        className="whitespace-nowrap"
                                    >
                                        {item.name}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </NavLink>
                    );
                })}
            </nav>

            {/* ── User info + Logout ─────────────────────────────────────── */}
            {!!user && (
                <div className="space-y-2 overflow-x-hidden border-t border-gray-200 p-3 dark:border-gray-800">
                    <div
                        className={`flex items-center rounded-md ${isCollapsed ? 'justify-center' : 'px-3 py-2'}`}
                    >
                        <Link
                            to={'/profile'}
                            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 font-bold text-gray-600 ring-1 ring-gray-200 transition-opacity hover:opacity-80 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-800"
                        >
                            {user.profileUrl ? (
                                <img
                                    src={user.profileUrl}
                                    alt={user.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span>{user.name.charAt(0).toUpperCase()}</span>
                            )}
                        </Link>

                        <AnimatePresence initial={false}>
                            {!isCollapsed && (
                                <motion.div
                                    variants={textVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    className="ml-3 flex flex-col whitespace-nowrap"
                                >
                                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                        {user.name.split(' ')[0]}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <Button
                        variant="ghost"
                        className={`w-full text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white ${
                            isCollapsed
                                ? 'justify-center px-0'
                                : 'justify-start px-3'
                        }`}
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        title={isCollapsed ? 'Logout' : undefined}
                    >
                        {isLoggingOut ? (
                            <Loader2
                                className={`h-5 w-5 animate-spin ${isCollapsed ? '' : 'mr-3'}`}
                            />
                        ) : (
                            <LogOut
                                className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`}
                            />
                        )}
                        <AnimatePresence initial={false}>
                            {!isCollapsed && (
                                <motion.span
                                    variants={textVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    className="whitespace-nowrap"
                                >
                                    {isLoggingOut ? 'Logging out…' : 'Logout'}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </Button>
                </div>
            )}
        </div>
    );
}
