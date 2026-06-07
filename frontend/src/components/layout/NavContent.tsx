import {
    Building,
    CalendarCheck,
    Home,
    LogOut,
    Loader2,
    Settings,
    Users,
} from 'lucide-react';
import { Button } from '../ui/button';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLogoutMutation } from '@/features/auth/api/auth';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { UserRole } from '@/features/auth/types';

// ---------------------------------------------------------------------------
// Navigation link definitions
// ---------------------------------------------------------------------------

interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    /** Restrict visibility to specific roles; omit to show to all. */
    roles?: UserRole[];
}

/**
 * Master navigation configuration.
 * Add or remove items here as features are built out.
 */
const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Hostels', href: '/hostels', icon: Building },
    { name: 'Bookings', href: '/bookings', icon: CalendarCheck },
    {
        name: 'Users',
        href: '/users',
        icon: Users,
        roles: ['ADMIN'],
    },
    { name: 'Settings', href: '/settings', icon: Settings },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NavContentProps {
    /** Called after a nav item is clicked — used to close the mobile sheet. */
    onItemClick?: () => void;
}

/**
 * Sidebar navigation content.
 *
 * Renders a filtered list of navigation links based on the current user's
 * role, and a logout button that invalidates the session server-side before
 * clearing local auth state.
 */
export function NavContent({ onItemClick }: NavContentProps) {
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();
    const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();

    /** Filter nav items to only those the current role is allowed to see. */
    const visibleItems = navigation.filter(
        (item) => !item.roles || (user && item.roles.includes(user.role))
    );

    const handleLogout = () => {
        logout(undefined, {
            onSettled: () => {
                navigate('/login', { replace: true });
            },
        });
    };

    return (
        <div className="flex h-full flex-col gap-4">
            {/* ── Logo / Brand ───────────────────────────────────────────── */}
            <div className="flex h-14 items-center border-b border-gray-200 px-4 dark:border-gray-800">
                <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    Leroy Hostels
                </span>
            </div>

            {/* ── Navigation Links ───────────────────────────────────────── */}
            <nav className="flex-1 space-y-0.5 px-2">
                {visibleItems.map((item) => {
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={onItemClick}
                            className={({ isActive }) =>
                                [
                                    'group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                                    isActive
                                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white',
                                ].join(' ')
                            }
                        >
                            <Icon
                                className="mr-3 h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-white"
                                aria-hidden="true"
                            />
                            {item.name}
                        </NavLink>
                    );
                })}
            </nav>

            {/* ── User info + Logout ─────────────────────────────────────── */}
            <div className="space-y-2 border-t border-gray-200 p-3 dark:border-gray-800">
                {/* Current user pill */}
                {user && (
                    <div className="rounded-md px-3 py-2">
                        <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
                            {user.name}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                        </p>
                    </div>
                )}

                {/* Logout button */}
                <Button
                    variant="ghost"
                    className="w-full justify-start text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    aria-label="Log out of your account"
                >
                    {isLoggingOut ? (
                        <>
                            <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                            Logging out…
                        </>
                    ) : (
                        <>
                            <LogOut className="mr-3 h-4 w-4" />
                            Logout
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
