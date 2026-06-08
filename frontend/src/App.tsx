import { BrowserRouter } from 'react-router-dom';
import { useAuthInit } from '@/features/auth/hooks/useAuthInit';
import { AppRoutes } from '@/routes/AppRoutes';
import { ThemeProvider } from '@/components/theme-provider';
import { AppLoader } from '@/components/ui/AppLoader';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppErrorFallback } from './components/ui/AppErrorFallback';
import { Suspense } from 'react';
import { useServiceWorker } from './hooks/useServiceWorker';

// ---------------------------------------------------------------------------
// RootAppEngine
// ---------------------------------------------------------------------------

/**
 * Inner engine that runs inside all providers.
 *
 * Separated from `App` so `useAuthInit` can consume the QueryClient and
 * BrowserRouter contexts that wrap it.
 *
 * `useAuthInit` fires the bootstrap refresh cycle exactly once on mount.
 * Until `isInitialized` flips to true in the auth store, both ProtectedRoute
 * and PublicRoute render <AppLoader /> — guaranteeing zero premature redirects.
 */
function RootAppEngine() {
    useServiceWorker();
    useAuthInit();

    return (
        <ErrorBoundary
            fallback={
                <AppErrorFallback
                    error={new Error('App initialisation failed')}
                    resetError={() => window.location.reload()}
                />
            }
        >
            <Suspense fallback={<AppLoader />}>
                <AppRoutes />
            </Suspense>
        </ErrorBoundary>
    );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

/**
 * Application root.
 *
 * Provider order matters:
 *  1. ThemeProvider  — reads/writes `localStorage` for theme persistence
 *  2. BrowserRouter  — must wrap anything that uses React Router hooks
 *  3. QueryClientProvider — must wrap anything that uses React Query hooks
 *
 * The global <Toaster /> lives here (not inside AppLayout) so notifications
 * are visible even on public pages like /login.
 */
export function App() {
    return (
        <ThemeProvider
            defaultTheme="system"
            storageKey="hostel-management-system:theme"
        >
            <BrowserRouter>
                <QueryClientProvider client={queryClient}>
                    <RootAppEngine />
                    <Toaster
                        closeButton
                        position="top-right"
                        richColors
                        duration={5000}
                    />
                </QueryClientProvider>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
