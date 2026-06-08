import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { AppLoader } from '@/components/ui/AppLoader';
import type { UserRole } from '@/features/user/types/user.types';


interface ProtectedRouteProps {
    /** Roles that are permitted to access this subtree */
    allowedRoles?: UserRole[];
}

/**
 * Guards a route subtree behind authentication and optional RBAC.
 *
 * Rendering order (flicker-free):
 *  1. Auth bootstrap still running  → show full-screen loader (no redirect yet)
 *  2. Bootstrap done, not authed    → redirect to /login (preserve intended URL)
 *  3. Bootstrap done, authed, wrong role → redirect to /unauthorized
 *  4. Bootstrap done, authed, role OK   → render children via <Outlet />
 *
 * The key insight: we NEVER redirect while `isInitialized` is false.
 * This prevents the race condition where a hard URL-bar navigation renders
 * the route tree before the refresh token exchange completes, causing a
 * premature logout redirect.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { isInitialized, isAuthenticated, user, isLoading } = useAuthStore();
    const location = useLocation();

    // Phase 1: Bootstrap in progress — render nothing meaningful yet.
    // The AppLoader is already shown by the Suspense wrapper in App.tsx,
    // but we add a safety net here for the auth-specific loading window.
    if (!isInitialized) {
        return <AppLoader />;
    }

    // Show loading state while requests (login, logout, profile fetch) are in progress
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
        );
    }

    // Phase 2: Bootstrap complete but no valid session.
    // Preserve the original destination so we can redirect back after login.
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Phase 3: Authenticated but role not permitted for this resource.
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    // Phase 4: All checks passed — render the protected subtree.
    return <Outlet />;
}
