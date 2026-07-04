import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { ProfileUser } from '@/features/user/types/user.types';

const studentUser = { id: '1', role: 'STUDENT' } as ProfileUser;
const managerUser = { id: '2', role: 'MANAGER' } as ProfileUser;

function setAuthState(
    overrides: Partial<ReturnType<typeof useAuthStore.getState>>
) {
    useAuthStore.setState({
        user: null,
        hostel: null,
        isInitialized: true,
        isLoading: false,
        isAuthenticated: false,
        isRefreshing: false,
        ...overrides,
    });
}

/** Renders the guard behind a route tree so <Navigate> / <Outlet> resolve realistically. */
function renderGuarded(
    allowedRoles?: ('ADMIN' | 'MANAGER' | 'STUDENT')[],
    initialRoute = '/protected'
) {
    return render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
                <Route path="/login" element={<div>Login Page</div>} />
                <Route
                    path="/unauthorized"
                    element={<div>Unauthorized Page</div>}
                />
                <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
                    <Route
                        path="/protected"
                        element={<div>Protected Content</div>}
                    />
                </Route>
            </Routes>
        </MemoryRouter>
    );
}

describe('ProtectedRoute', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('shows the app loader while auth bootstrap has not finished', () => {
        setAuthState({ isInitialized: false, isLoading: true });
        renderGuarded();
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows a spinner while a request (login/logout/refresh) is in flight', () => {
        setAuthState({
            isInitialized: true,
            isLoading: true,
            isAuthenticated: true,
            user: studentUser,
        });
        const { container } = renderGuarded();
        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('redirects to /login when bootstrap is done but the user is unauthenticated', () => {
        setAuthState({
            isInitialized: true,
            isLoading: false,
            isAuthenticated: false,
        });
        renderGuarded();
        expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('redirects to /unauthorized when the role is not permitted', () => {
        setAuthState({
            isInitialized: true,
            isLoading: false,
            isAuthenticated: true,
            user: studentUser,
        });
        renderGuarded(['ADMIN', 'MANAGER']);
        expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
    });

    it('renders the protected content when authenticated with an allowed role', () => {
        setAuthState({
            isInitialized: true,
            isLoading: false,
            isAuthenticated: true,
            user: managerUser,
        });
        renderGuarded(['ADMIN', 'MANAGER']);
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('renders the protected content when no allowedRoles restriction is set', () => {
        setAuthState({
            isInitialized: true,
            isLoading: false,
            isAuthenticated: true,
            user: studentUser,
        });
        renderGuarded(undefined);
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
});
