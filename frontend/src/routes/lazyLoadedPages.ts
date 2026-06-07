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

export const ResetPassword = lazy(() => import("@/features/auth/pages/ResetPassword"))

export const VerifyEmail = lazy(() => import("@/features/auth/pages/VerifyEmail"))

export const ForgotPassword = lazy(() => import("@/features/auth/pages/ForgotPassword"))

export const Register = lazy(() => import("@/features/auth/pages/Register"))

export const Hostels = lazy(() => import("@/features/hostel/pages/Hostels"))

export const Rooms = lazy(() => import("@/features/hostel/pages/Rooms"))