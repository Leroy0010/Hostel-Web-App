import { LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useLogoutMutation } from '@/features/auth/api/auth';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { UserRole } from '@/features/user/types/user.types';
import { motion, AnimatePresence } from 'framer-motion';
import { navigation } from './navigation';

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

// Animation variants for text elements
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
    const isAthtenticated = useAuthStore(state => state.isAuthenticated)
    const navigate = useNavigate();
    const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();

    const visibleItems = navigation(isAthtenticated).filter((item) =>
        (user && item.roles?.includes(user.role)) || !item.roles
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
                            title={isCollapsed ? item.name : undefined} // Native tooltip when collapsed
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
                        <Link to={'/profile'} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {user.name.charAt(0)}
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
