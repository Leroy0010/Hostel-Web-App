import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/routing/ProtectedRoute';
import { PublicRoute } from '@/components/routing/PublicRoute';
import { AppLoader } from '@/components/ui/AppLoader';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import {
    Dashboard,
    ForgotPassword,
    Hostels,
    Login,
    NotFound,
    Register,
    ResetPassword,
    Rooms,
    Unauthorized,
    VerifyEmail,
} from './lazyLoadedPages';

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
                    <Route path="/hostels" element={<Hostels />} />
                    <Route path="/rooms" element={<Rooms />} />
                </Route>

                {/* ── Error / informational pages ──────────────────────────── */}
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* ── Protected spaces (all authenticated roles) ───────────── */}
                <Route
                    element={
                        <ProtectedRoute
                            allowedRoles={['ADMIN', 'MANAGER', 'STUDENT']}
                        />
                    }
                >
                    {/*
                     * Root "/" renders a role-aware redirect so each role lands
                     * on its own workspace. As feature-dashboards are added,
                     * replace the <Navigate /> with the real page component.
                     */}
                    <Route path="/" element={<RootIndexRedirect />} />

                    {/* Shared protected routes */}
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/*
                     * Future feature routes — uncomment when ready:
                     *   <Route path="/hostels"  element={<HostelsPage />} />
                     *   <Route path="/bookings" element={<BookingsPage />} />
                     *   <Route path="/settings" element={<SettingsPage />} />
                     */}
                </Route>

                {/* ── Catch-all fallback ────────────────────────────────────── */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );
}

// ---------------------------------------------------------------------------
// Role-aware root redirect
// ---------------------------------------------------------------------------

/**
 * Steers authenticated users from "/" to their role-specific workspace home.
 *
 * NOTE: This component only ever renders inside a <ProtectedRoute />, so by
 * the time it mounts, `isInitialized` is guaranteed true and `user` is non-null.
 * As role-specific dashboards are built out, replace the Navigate targets.
 */
function RootIndexRedirect() {
    const user = useAuthStore((state) => state.user);

    if (!user) {
        // Defensive fallback — should never reach here inside ProtectedRoute.
        return <Navigate to="/login" replace />;
    }

    switch (user.role) {
        case 'ADMIN':
            return <Navigate to="/dashboard" replace />;
        case 'MANAGER':
            return <Navigate to="/dashboard" replace />;
        case 'STUDENT':
            return <Navigate to="/dashboard" replace />;
        default:
            return <Navigate to="/login" replace />;
    }
}
