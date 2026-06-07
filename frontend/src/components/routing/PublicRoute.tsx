import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { AppLoader } from '@/components/ui/AppLoader';

/**
 * Guards public-only routes (e.g. /login) from authenticated users.
 *
 * Rendering logic:
 *  1. Bootstrap still running  → show loader (never redirect prematurely)
 *  2. Bootstrap done, authed   → redirect to application root
 *  3. Bootstrap done, no auth  → render public page via <Outlet />
 *
 * Without the `isInitialized` gate, a user who is actually authenticated
 * but whose refresh token exchange hasn't finished yet would see a flash
 * of the login page — or worse, end up stuck there.
 */
export function PublicRoute() {
    const { isInitialized, isAuthenticated, isLoading } = useAuthStore();

    // Phase 1: Wait for bootstrap to complete before deciding anything.
    if (!isInitialized || isLoading) {
        return <AppLoader />;
    }

    // Phase 2: Already authenticated — send to app root.
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Phase 3: Not authenticated — render the public page.
    return <Outlet />;
}
