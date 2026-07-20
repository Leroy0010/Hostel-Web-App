import type { UserRole } from '@/features/user/types/user.types';
import {
    Building,
    Building2,
    Clock,
    Home,
    LayoutDashboard,
    ListCheck,
    MapPin,
    MapPinPlus,
    MessageSquareWarning,
    NotebookTabs,
    ScrollText,
    Star,
    UserCog,
    Users,
} from 'lucide-react';

export interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    roles?: UserRole[];
}

export const navigation = (isAuthenticated: boolean): NavItem[] => [
    {
        name: isAuthenticated ? 'Dashboard' : 'Home',
        href: '/',
        icon: isAuthenticated ? LayoutDashboard : Home,
    },
    {
        name: 'Bookings',
        href: '/student/bookings',
        icon: NotebookTabs,
        roles: ['STUDENT'],
    },
    {
        name: 'Waitlist',
        href: '/student/waitlist',
        icon: ListCheck,
        roles: ['STUDENT'],
    },
    {
        name: 'Preferences',
        href: '/student/preferences',
        icon: UserCog,
        roles: ['STUDENT'],
    },
    {
        name: 'My Complaints',
        href: '/student/complaints',
        icon: MessageSquareWarning,
        roles: ['STUDENT'],
    },
    {
        name: 'My Reviews',
        href: '/student/reviews',
        icon: Star,
        roles: ['STUDENT'],
    },
    {
        name: 'Pending Bookings',
        href: '/manager/bookings/pending',
        icon: Clock,
        roles: ['MANAGER'],
    },

    {
        name: 'My Hostels',
        href: '/manager/hostels',
        icon: Building2,
        roles: ['MANAGER'],
    },
    {
        name: 'Manage Hostels',
        href: '/admin/hostels',
        icon: Building2,
        roles: ['ADMIN'],
    },

    { name: 'Users', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
    {
        name: 'Landmarks',
        href: '/admin/landmarks',
        icon: MapPinPlus,
        roles: ['ADMIN'],
    },
    {
        name: 'Audit Log',
        href: '/admin/audit-logs',
        icon: ScrollText,
        roles: ['ADMIN'],
    },
    { name: 'Hostels', href: '/hostels', icon: Building },
    { name: 'Campus Map', href: '/map', icon: MapPin },
];
