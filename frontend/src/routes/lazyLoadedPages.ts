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
export const Dashboard = lazy(
    () => import('@/features/dashboard/pages/DashboardPage')
);

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

export const RoomDetailsPage = lazy(
    () => import('@/features/room/pages/RoomDetailPage')
);

export const BookingDetailPage = lazy(
    () => import('@/features/booking/pages/BookingDetailPage')
);

export const ManagerRoomsPage = lazy(
    () => import('@/features/room/pages/ManagerRoomsPage')
);
export const ManagerHostelBookings = lazy(
    () => import('@/features/booking/pages/ManagerHostelBookings')
);
export const ManagerPendingBookings = lazy(
    () => import('@/features/booking/pages/ManagerPendingBookings')
);

export const StudentBookings = lazy(
    () => import('@/features/booking/pages/StudentBookings')
);

export const Notifications = lazy(
    () => import('@/features/notification/pages/Notifications')
);

export const Profile = lazy(() => import('@/features/user/pages/Profile'));

export const MyReviews = lazy(
    () => import('@/features/review/pages/MyReviewsPage')
);

export const MyComplaints = lazy(
    () => import('@/features/complaint/pages/MyComplaintsPage')
);

export const ComplaintDetailPage = lazy(
    () => import('@/features/complaint/pages/ComplaintDetailPage')
);

export const ManagerHostelComplaintsPage = lazy(
    () => import('@/features/complaint/pages/ManagerHostelComplaintsPage')
);

export const AdminLandmarks = lazy(
    () => import('@/features/map/pages/AdminLandmarksPage')
);


export const CampusMap = lazy(() => import('@/features/map/pages/CampusMap'));

export const StudentWaitlist = lazy(
    () => import('@/features/waitlist/pages/StudentWaitlistPage')
);

export const ManagerWaitlist = lazy(
    () => import('@/features/waitlist/pages/ManagerWaitlistPage')
);

export const StudentPreferencePage = lazy(
    () => import('@/features/preference/pages/StudentPreferencePage')
);

export const UserManamentPage = lazy(
    () => import('@/features/user-management/pages/UserManagementPage')
);
