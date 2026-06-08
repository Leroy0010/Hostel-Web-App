import type { UserRole } from '@/features/user/types/user.types';
import {
    Building,
    CalendarCheck,
    Home,
    LayoutDashboard,
    Users,
} from 'lucide-react';

export interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    roles?: UserRole[];
}

export const navigation: NavItem[] = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Hostels', href: '/hostels', icon: Building },
    {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['ADMIN', 'MANAGER', 'STUDENT'],
    },
    {
        name: 'Bookings',
        href: '/bookings',
        icon: CalendarCheck,
        roles: ['MANAGER', 'STUDENT'],
    },
    {
        name: 'My Hostels',
        href: '/manager/hostels',
        icon: Building,
        roles: ['MANAGER'],
    },
    {
        name: 'Hostels',
        href: '/admin/hostels',
        icon: Building,
        roles: ['ADMIN'],
    },

    { name: 'Hostels', href: '/hostels', icon: Building, roles: ['STUDENT'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['ADMIN'] },
];
