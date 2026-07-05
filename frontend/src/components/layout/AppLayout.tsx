import { useState } from 'react';
import {
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Bell,
    Sun,
    Moon,
    User,
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { NavContent } from './NavContent';
import { useSidebarStore } from '@/store/useSidebarStore';
import { useTheme } from '@/components/theme-provider';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, Outlet } from 'react-router-dom';
import { useUnreadCount } from '@/features/notification/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useNotificationStomp } from '@/features/notification/hooks/useNotificationStomp';
import { PushNotificationPrompt } from '@/features/notification/components/PushNotificationPrompt';

// Animation variants for text elements
const textVariants = {
    hidden: { opacity: 0, width: 0, transition: { duration: 0.2 } },
    visible: {
        opacity: 1,
        width: 'auto',
        transition: { duration: 0.2, delay: 0.1 },
    },
};

interface AppLayoutProps {
    isHomePage?: boolean;
}

export function AppLayout({ isHomePage }: AppLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const user = useAuthStore((state) => state.user);

    useNotificationStomp(isAuthenticated);

    const { data: unreadCountData } = useUnreadCount(isAuthenticated);

    // Zustand store for persisting desktop toggle state
    const { isCollapsed, toggleSidebar } = useSidebarStore();

    // Theme context
    const { theme, setTheme } = useTheme();

    // Desktop Sidebar Width Configurations
    const SIDEBAR_WIDTH_EXPANDED = 256; // 16rem (w-64)
    const SIDEBAR_WIDTH_COLLAPSED = 80; // 5rem (w-20)

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-gray-50 text-gray-900 transition-colors duration-200 selection:bg-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:selection:bg-gray-800">
            {/* ── Topbar ────────────────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md transition-colors dark:border-gray-800 dark:bg-gray-900/80">
                <div className="z-99999 flex items-center gap-1">
                    {/* Mobile Hamburger (Opens Sheet) */}
                    <div className="lg:hidden">
                        <Sheet
                            open={isMobileMenuOpen}
                            onOpenChange={setIsMobileMenuOpen}
                        >
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Open menu"
                                    className="text-gray-600 dark:text-gray-300"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="z-9999999 w-64 border-r border-gray-200 bg-white p-0 text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                            >
                                <SheetTitle className="sr-only">
                                    Navigation Menu
                                </SheetTitle>
                                <NavContent
                                    onItemClick={() =>
                                        setIsMobileMenuOpen(false)
                                    }
                                    isCollapsed={false}
                                />
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Desktop Toggle Sidebar Button */}
                    <Button
                        variant="ghost"
                        title="Toggle Sidebar"
                        size="icon"
                        onClick={toggleSidebar}
                        className="hidden text-gray-500 hover:text-gray-900 lg:flex dark:text-gray-400 dark:hover:text-gray-100"
                        aria-label={
                            isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
                        }
                    >
                        {isCollapsed ? (
                            <PanelLeftOpen className="h-5 w-5" />
                        ) : (
                            <PanelLeftClose className="h-5 w-5" />
                        )}
                    </Button>

                    {/* Brand Name */}
                    <div className="flex shrink-0 items-center border-b border-gray-200 px-3 pl-1 sm:px-4 dark:border-gray-800">
                        <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md font-bold text-white sm:flex">
                            <img
                                src="/icons/icon-512x512.png"
                                alt="app-logo"
                                className="rounded-sm"
                            />
                        </div>
                        <AnimatePresence initial={false}>
                            {!isCollapsed && (
                                <motion.span
                                    variants={textVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    className="ml-1 text-lg font-bold tracking-tight whitespace-nowrap text-gray-900 sm:ml-3 dark:text-gray-100"
                                >
                                    <Link
                                        to="/"
                                        className="rounded-md bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent drop-shadow-sm focus:ring-2 focus:outline-none dark:from-blue-400 dark:to-purple-400"
                                    >
                                        HostelLife+
                                    </Link>
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right side of Topbar */}
                <div className="flex items-center gap-2">
                    {/* Theme Toggle (Always visible) */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                            setTheme(theme === 'dark' ? 'light' : 'dark')
                        }
                        aria-label="theme-toggle"
                    >
                        {theme === 'dark' ? (
                            <Sun size={24} />
                        ) : (
                            <Moon size={24} />
                        )}
                    </Button>

                    {/* Auth Conditional Rendering */}
                    {!isInitialized ? (
                        // 1. LOADING STATE: Show skeleton placeholders while checking auth
                        <div className="ml-2 flex items-center gap-3">
                            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                        </div>
                    ) : isAuthenticated ? (
                        // 2. AUTHENTICATED STATE: Show Notifications and Profile
                        <>
                            {/* Notifications */}
                            <Link
                                to="/notifications"
                                aria-label="Notifications"
                                className={cn(
                                    buttonVariants({
                                        variant: 'ghost',
                                        size: 'icon',
                                    }),
                                    'relative text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                                )}
                            >
                                <Bell
                                    size={24}
                                    aria-label="Notification Bell"
                                />

                                {/* Unread Count Badge */}
                                <AnimatePresence>
                                    {unreadCountData &&
                                        unreadCountData.count > 0 && (
                                            <motion.span
                                                initial={{
                                                    scale: 0,
                                                    opacity: 0,
                                                }}
                                                animate={{
                                                    scale: 1,
                                                    opacity: 1,
                                                }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 500,
                                                    damping: 30,
                                                }}
                                                className="absolute top-0 right-1 flex h-2 w-2 animate-ping items-center justify-center rounded-full bg-red-500 text-[6px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900"
                                                aria-label="Notification unread count"
                                            >
                                                {unreadCountData.count > 99
                                                    ? '99+'
                                                    : unreadCountData.count}
                                            </motion.span>
                                        )}
                                </AnimatePresence>
                            </Link>

                            {/* Profile Update: URL mapping & Avatar formatting */}
                            <Link
                                to="/profile"
                                aria-label="Profile"
                                className={cn(
                                    buttonVariants({
                                        variant: 'ghost',
                                        size: 'icon',
                                    }),
                                    'overflow-hidden rounded-full text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                                )}
                            >
                                {user?.profileUrl ? (
                                    <img
                                        src={user.profileUrl}
                                        alt={user.name}
                                        className="h-8 w-8 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-800"
                                    />
                                ) : user?.name ? (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                ) : (
                                    <User size={24} />
                                )}
                            </Link>
                        </>
                    ) : (
                        // 3. UNAUTHENTICATED STATE: Show Login and Register
                        <div className="ml-2 flex items-center gap-2">
                            <Link
                                to="/login"
                                className={buttonVariants({ variant: 'ghost' })}
                            >
                                Log in
                            </Link>
                            <Link
                                to="/register"
                                className={buttonVariants({
                                    variant: 'default',
                                })}
                            >
                                Register
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Main Body (Sidebar + Content Side-by-Side Below Header) ───────────────── */}
            <div className="flex flex-1 overflow-hidden">
                {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
                <motion.aside
                    initial={false}
                    animate={{
                        width: isCollapsed
                            ? SIDEBAR_WIDTH_COLLAPSED
                            : SIDEBAR_WIDTH_EXPANDED,
                    }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="relative z-9999999! hidden shrink-0 scrollbar-none! flex-col overflow-hidden border-r border-gray-200 bg-white/80 backdrop-blur-xl [-ms-overflow-style:none] lg:flex dark:border-gray-800 dark:bg-gray-900/50"
                >
                    <NavContent isCollapsed={isCollapsed} />
                </motion.aside>

                {/* ── Page Content ───────────────────────────────────────────── */}
                <main
                    className={`flex-1 scrollbar-none overflow-y-auto ${isHomePage ? '' : 'p-4 md:p-6 lg:p-8'}`}
                >
                    <Outlet />
                </main>
            </div>
            {/* 2. Conditionally render the push notification prompt here */}
            {isAuthenticated && <PushNotificationPrompt />}
        </div>
    );
}
