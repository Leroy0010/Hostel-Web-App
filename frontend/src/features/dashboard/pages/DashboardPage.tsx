import { motion } from 'framer-motion';
import { LayoutDashboard } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { useDashboard } from '../hooks/dashboard.hooks';
import { AdminDashboard } from '../components/AdminDashboard';
import { ManagerDashboard } from '../components/ManagerDashboard';
import { StudentDashboard } from '../components/StudentDashboard';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { transition } from '@/features/auth/utils/transition';
import type {
    AdminDashboard as AdminDashboardType,
    StudentDashboard as StudentDashboardType,
    ManagerDashboard as ManagerDashboardType,
} from '../types/dashboard.types';
import { Home } from './Home';

// =============================================================================
// Animation
// =============================================================================

const pageVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition },
};

// =============================================================================
// Page
// =============================================================================

/**
 * Top-level dashboard page — role-dispatched.
 *
 * A single {@code GET /api/dashboard} call returns a discriminated union
 * keyed on {@code role}. This page narrows the type and renders the
 * appropriate dashboard component:
 *
 *  - {@code role === 'ADMIN'}   → {@link AdminDashboard}   (system-wide)
 *  - {@code role === 'MANAGER'} → {@link ManagerDashboard}  (scoped hostels)
 *  - {@code role === 'STUDENT'} → {@link StudentDashboard}  (personal view)
 *
 * The page header subtitle is personalized using the authenticated user's
 * first name from the auth store, giving the dashboard a welcoming feel
 * without an extra API call.
 *
 * Route: {@code /dashboard} — protected, all authenticated roles.
 */
export default function DashboardPage() {
    const { user, isAuthenticated } = useAuthStore();

    const { data, isLoading, isError, refetch, isFetching } =
        useDashboard(isAuthenticated);

    const firstName = user?.name.split(' ')[0];

    const greeting = firstName
        ? `Welcome back, ${firstName}.`
        : 'Welcome back.';

    if (!isAuthenticated) return <Home />;

    return (
        <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* ── Page header ─────────────────────────────────────────── */}
            <PageHeader title="Dashboard" description={greeting} />

            {/* ── Content ─────────────────────────────────────────────── */}
            {isError ? (
                <EmptyState
                    icon={<LayoutDashboard className="h-8 w-8 text-gray-400" />}
                    title="Could not load dashboard"
                    description="There was a problem fetching your dashboard data. Please try again."
                    action={
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                        >
                            Retry
                        </Button>
                    }
                />
            ) : (
                <div
                    className={`transition-opacity duration-200 ${isFetching ? 'opacity-70' : 'opacity-100'}`}
                >
                    {user?.role === 'ADMIN' && (
                        <AdminDashboard
                            data={data as AdminDashboardType}
                            isLoading={isLoading}
                        />
                    )}
                    {user?.role === 'MANAGER' && (
                        <ManagerDashboard
                            data={data as ManagerDashboardType}
                            isLoading={isLoading}
                        />
                    )}
                    {user?.role === 'STUDENT' && (
                        <StudentDashboard
                            data={data as StudentDashboardType}
                            isLoading={isLoading}
                        />
                    )}
                </div>
            )}
        </motion.div>
    );
}
