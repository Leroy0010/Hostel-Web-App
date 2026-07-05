import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import DashboardPage from './DashboardPage';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { ProfileUser } from '@/features/user/types/user.types';

// -----------------------------------------------------------------------
// DashboardPage's only real responsibility is picking the right
// role-specific component and passing it the (type-narrowed) data. The
// three dashboard components' internal rendering is covered by their own
// test files — here we only need to know *which one* rendered.
// -----------------------------------------------------------------------
vi.mock('../components/AdminDashboard', () => ({
    AdminDashboard: ({ data }: { data: { role: string } }) => (
        <div data-testid="admin-dashboard">Admin dashboard: {data.role}</div>
    ),
}));
vi.mock('../components/ManagerDashboard', () => ({
    ManagerDashboard: ({ data }: { data: { role: string } }) => (
        <div data-testid="manager-dashboard">
            Manager dashboard: {data.role}
        </div>
    ),
}));
vi.mock('../components/StudentDashboard', () => ({
    StudentDashboard: ({ data }: { data: { role: string } }) => (
        <div data-testid="student-dashboard">
            Student dashboard: {data.role}
        </div>
    ),
}));
vi.mock('./Home', () => ({
    Home: () => <div data-testid="home-page">Public home page</div>,
}));

const mockUseDashboard = vi.fn();
vi.mock('../hooks/dashboard.hooks', () => ({
    useDashboard: (...args: unknown[]) => mockUseDashboard(...args),
}));

function setAuthUser(user: Partial<ProfileUser> | null) {
    useAuthStore.setState({
        user: user as ProfileUser | null,
        hostel: null,
        isInitialized: true,
        isLoading: false,
        isAuthenticated: Boolean(user),
        isRefreshing: false,
    });
}

describe('DashboardPage', () => {
    beforeEach(() => {
        mockUseDashboard.mockReset();
    });

    it('renders the public Home page when the user is not authenticated', () => {
        setAuthUser(null);
        mockUseDashboard.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: false,
            isFetching: false,
            refetch: vi.fn(),
        });

        renderWithProviders(<DashboardPage />);
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    it('renders AdminDashboard when the authenticated role is ADMIN', () => {
        setAuthUser({ name: 'Ama Owusu', role: 'ADMIN' });
        mockUseDashboard.mockReturnValue({
            data: { role: 'ADMIN' },
            isLoading: false,
            isError: false,
            isFetching: false,
            refetch: vi.fn(),
        });

        renderWithProviders(<DashboardPage />);
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
        expect(
            screen.queryByTestId('manager-dashboard')
        ).not.toBeInTheDocument();
        expect(
            screen.queryByTestId('student-dashboard')
        ).not.toBeInTheDocument();
    });

    it('renders ManagerDashboard when the authenticated role is MANAGER', () => {
        setAuthUser({ name: 'Kwame Mensah', role: 'MANAGER' });
        mockUseDashboard.mockReturnValue({
            data: { role: 'MANAGER' },
            isLoading: false,
            isError: false,
            isFetching: false,
            refetch: vi.fn(),
        });

        renderWithProviders(<DashboardPage />);
        expect(screen.getByTestId('manager-dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();
        expect(
            screen.queryByTestId('student-dashboard')
        ).not.toBeInTheDocument();
    });

    it('renders StudentDashboard when the authenticated role is STUDENT', () => {
        setAuthUser({ name: 'Lexa Doe', role: 'STUDENT' });
        mockUseDashboard.mockReturnValue({
            data: { role: 'STUDENT' },
            isLoading: false,
            isError: false,
            isFetching: false,
            refetch: vi.fn(),
        });

        renderWithProviders(<DashboardPage />);
        expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();
        expect(
            screen.queryByTestId('manager-dashboard')
        ).not.toBeInTheDocument();
    });

    it("personalizes the greeting with the user's first name", () => {
        setAuthUser({ name: 'Ama Owusu', role: 'ADMIN' });
        mockUseDashboard.mockReturnValue({
            data: { role: 'ADMIN' },
            isLoading: false,
            isError: false,
            isFetching: false,
            refetch: vi.fn(),
        });

        renderWithProviders(<DashboardPage />);
        expect(screen.getByText('Welcome back, Ama.')).toBeInTheDocument();
    });

    it('shows a retry-able error state and refetches when Retry is clicked', async () => {
        const user = userEvent.setup();
        const refetch = vi.fn();
        setAuthUser({ name: 'Ama Owusu', role: 'ADMIN' });
        mockUseDashboard.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            isFetching: false,
            refetch,
        });

        renderWithProviders(<DashboardPage />);
        expect(
            screen.getByText('Could not load dashboard')
        ).toBeInTheDocument();
        expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /retry/i }));
        expect(refetch).toHaveBeenCalled();
    });

    it('dims the content while a background refetch is in flight', () => {
        setAuthUser({ name: 'Ama Owusu', role: 'ADMIN' });
        mockUseDashboard.mockReturnValue({
            data: { role: 'ADMIN' },
            isLoading: false,
            isError: false,
            isFetching: true,
            refetch: vi.fn(),
        });

        renderWithProviders(<DashboardPage />);
        expect(screen.getByTestId('admin-dashboard').parentElement).toHaveClass(
            'opacity-70'
        );
    });
});
