import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/routing/ProtectedRoute';
import { PublicRoute } from '@/components/routing/PublicRoute';
import { AppLoader } from '@/components/ui/AppLoader';
import {
    AdminHostels,
    Dashboard,
    ForgotPassword,
    Hostels,
    HostelsDetailsPage,
    Login,
    ManagerHostelBookings,
    ManagerHostels,
    ManagerRoomsPage,
    NotFound,
    Notifications,
    Profile,
    Register,
    ResetPassword,
    RoomDetailsPage,
    StudentBookings,
    Unauthorized,
    VerifyEmail,
    ManagerPendingBookings,
    BookingDetailPage,
    MyReviews,
    MyComplaints,
    ManagerHostelComplaintsPage,
    CampusMap,
    AdminLandmarks,
    ComplaintDetailPage,
    ManagerWaitlist,
    StudentWaitlist,
    StudentPreferencePage,
    UserManamentPage,
    AuditLog,
} from './lazyLoadedPages';
import { AppLayout } from '@/components/layout/AppLayout';

/**
 * Application route tree.
 *
 * Design decisions:
 * - One `<Route path="/" ...>` per segment — no duplicate definitions.
 * - ProtectedRoute and PublicRoute both gate on `isInitialized` so routing
 *   decisions are never made against uninitialised auth state.
 * - The `<RootIndexRedirect />` component handles post-login role steering
 *   and lives *inside* the ProtectedRoute subtree, so it only ever runs when
 *   a valid, initialised session exists.
 */
export function AppRoutes() {
    return (
        <Suspense fallback={<AppLoader />}>
            <Routes>
                {/* ── Public spaces (unauthenticated only) ─────────────────── */}
                <Route element={<PublicRoute />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                    />
                    <Route path="/setup-password" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                </Route>

                {/* ── Error / informational pages ──────────────────────────── */}
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* ── Layout Viewports (Guests AND Authenticated Users) ─────── */}
                <Route element={<AppLayout />}>
                    {/* Open Content Pages */}

                    <Route path="/" element={<Dashboard />} />

                    <Route path="/hostels" element={<Hostels />} />
                    <Route
                        path="/hostels/:hostelId"
                        element={<HostelsDetailsPage />}
                    />

                    <Route
                        path="/hostels/:hostelId/rooms/:roomId"
                        element={<RoomDetailsPage />}
                    />

                    <Route path="/map" element={<CampusMap />} />

                    {/* ── Protected spaces (all authenticated roles) ───────────── */}
                    <Route
                        element={
                            <ProtectedRoute
                                allowedRoles={['ADMIN', 'MANAGER', 'STUDENT']}
                            />
                        }
                    >
                        {/* Shared protected routes */}

                        <Route path="/profile" element={<Profile />} />
                        <Route
                            path="/notifications"
                            element={<Notifications />}
                        />

                        <Route
                            path="/bookings/:id"
                            element={<BookingDetailPage />}
                        />

                        <Route
                            path="/complaints/:complaintId"
                            element={<ComplaintDetailPage />}
                        />

                        {/* Admin routes */}
                        <Route
                            element={
                                <ProtectedRoute allowedRoles={['ADMIN']} />
                            }
                            path="/admin"
                        >
                            <Route path="hostels" element={<AdminHostels />} />
                            <Route
                                path="hostels/:hostelId/complaints"
                                element={<ManagerHostelComplaintsPage />}
                            />
                            <Route
                                path="landmarks"
                                element={<AdminLandmarks />}
                            />

                            <Route
                                path="users"
                                element={<UserManamentPage />}
                            />

                            <Route path="audit-logs" element={<AuditLog />} />
                        </Route>

                        {/* Manager routes */}
                        <Route
                            element={
                                <ProtectedRoute allowedRoles={['MANAGER']} />
                            }
                            path="/manager"
                        >
                            <Route
                                path="hostels"
                                element={<ManagerHostels />}
                            />
                            <Route
                                path="hostels/:hostelId/rooms"
                                element={<ManagerRoomsPage />}
                            />
                            <Route
                                path="bookings/pending"
                                element={<ManagerPendingBookings />}
                            />

                            <Route
                                path="hostels/:hostelId/bookings"
                                element={<ManagerHostelBookings />}
                            />

                            <Route
                                path="hostels/:hostelId/waitlist"
                                element={<ManagerWaitlist />}
                            />

                            <Route
                                path="hostels/:hostelId/complaints"
                                element={<ManagerHostelComplaintsPage />}
                            />
                        </Route>

                        {/* Student routes */}
                        <Route
                            element={
                                <ProtectedRoute allowedRoles={['STUDENT']} />
                            }
                            path="/student"
                        >
                            <Route
                                path="bookings"
                                element={<StudentBookings />}
                            />
                            <Route
                                path="waitlist"
                                element={<StudentWaitlist />}
                            />
                            <Route
                                path="preferences"
                                element={<StudentPreferencePage />}
                            />
                            <Route
                                path="complaints"
                                element={<MyComplaints />}
                            />
                            <Route path="reviews" element={<MyReviews />} />
                        </Route>
                    </Route>
                </Route>

                {/* ── Catch-all fallback ────────────────────────────────────── */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );
}
