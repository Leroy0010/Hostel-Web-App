// ---------------------------------------------------------------------------
// Lazy-loaded public views

import { lazy } from 'react';

// ---------------------------------------------------------------------------
export const Login = lazy(() => import('@/features/auth/pages/Login'));
export const Unauthorized = lazy(() => import('@/pages/Unauthorized'));
export const NotFound = lazy(() => import('@/pages/NotFound'));

// ---------------------------------------------------------------------------
// Lazy-loaded protected views
// Uncomment as features are implemented:
//   const AdminDashboard  = lazy(() => import('@/features/admin/pages/Dashboard'));
//   const ManagerDashboard = lazy(() => import('@/features/manager/pages/Dashboard'));
//   const StudentDashboard = lazy(() => import('@/features/student/pages/Dashboard'));
// ---------------------------------------------------------------------------
export const Dashboard = lazy(() => import('@/DashboardContent'));

export const ResetPassword = lazy(
    () => import('@/features/auth/pages/ResetPassword')
);

export const VerifyEmail = lazy(
    () => import('@/features/auth/pages/VerifyEmail')
);

export const ForgotPassword = lazy(
    () => import('@/features/auth/pages/ForgotPassword')
);

export const Register = lazy(() => import('@/features/auth/pages/Register'));

export const Hostels = lazy(
    () => import('@/features/hostel/pages/HostelsPage')
);

export const ManagerHostels = lazy(
    () => import('@/features/hostel/pages/ManagerHostelsPage')
);

export const AdminHostels = lazy(
    () => import('@/features/hostel/pages/AdminHostelsPage')
);

export const HostelsDetailsPage = lazy(
    () => import('@/features/hostel/pages/HostelDetailsPage')
);

export const Rooms = lazy(() => import('@/features/hostel/pages/Rooms'));
export const RoomDetailsPage = lazy(() => import("@/features/room/pages/RoomDetailPage"))

export const ManagerRoomsPage = lazy(() => import("@/features/room/pages/ManagerRoomsPage"))

export const Notifications = lazy(
    () => import('@/features/notification/pages/Notifications')
);

export const Home = lazy(() => import('@/features/dashboard/pages/Home'));

export const Profile = lazy(() => import('@/features/user/pages/Profile'));
