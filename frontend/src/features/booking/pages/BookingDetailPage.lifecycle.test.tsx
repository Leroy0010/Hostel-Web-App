import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render } from '@testing-library/react';
import { createTestQueryClient } from '@/test/test-utils';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import BookingDetailPage from './BookingDetailPage';
import { createBookingLifecycleHandlers } from './bookingLifecycle.msw-handlers';
import type { ProfileUser } from '@/features/user/types/user.types';

/**
 * Full-stack-ish integration test for the booking lifecycle described in
 * the project brief: student request → manager approve → payment submit →
 * check-in. Unlike the unit tests elsewhere in this suite (which mock
 * `booking.hooks` entirely), this test lets the real hooks, API functions,
 * and React Query cache-invalidation logic run — MSW only intercepts the
 * HTTP layer. This is what actually proves the pieces wire together
 * end-to-end: a booking approved by a manager immediately shows a payment
 * countdown and CTA to the *same* rendered page once the query refetches,
 * with no manual cache manipulation in the test itself.
 */

const student: ProfileUser = {
    id: 'student-1',
    name: 'Lexa Doe',
    role: 'STUDENT',
} as ProfileUser;

const manager: ProfileUser = {
    id: 'manager-1',
    name: 'Kwame Mensah',
    role: 'MANAGER',
} as ProfileUser;

function setAuthUser(user: ProfileUser) {
    act(() => {
        useAuthStore.setState({
            user,
            hostel: null,
            isInitialized: true,
            isLoading: false,
            isAuthenticated: true,
            isRefreshing: false,
        });
    });
}

/** Renders BookingDetailPage behind a real route so useParams resolves. */
function renderBookingDetail(
    queryClient: ReturnType<typeof createTestQueryClient>
) {
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/bookings/booking-1']}>
                <Routes>
                    <Route
                        path="/bookings/:id"
                        element={<BookingDetailPage />}
                    />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe('Booking lifecycle (MSW integration)', () => {
    const { booking, handlers } = createBookingLifecycleHandlers();
    const server = setupServer(...handlers);

    beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it('walks a single booking from PENDING through CHECKED_IN across role switches', async () => {
        const user = userEvent.setup();
        const queryClient = createTestQueryClient();

        // ── Step 1: student views their PENDING request ────────────────────
        setAuthUser(student);
        renderBookingDetail(queryClient);

        expect(await screen.findByText('Room A12')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        // Awaiting manager action — student has no actions available yet.
        expect(
            screen.queryByRole('button', { name: /submit payment/i })
        ).not.toBeInTheDocument();

        // ── Step 2: manager approves the booking ───────────────────────────
        // The auth store update alone re-renders the already-mounted page
        // (it's a live Zustand subscription) — no need to remount.
        setAuthUser(manager);

        await user.click(
            await screen.findByRole('button', { name: /approve \/ reject/i })
        );
        const actionDialog = await screen.findByRole('dialog');
        await user.click(
            within(actionDialog).getByRole('button', {
                name: /approve booking/i,
            })
        );

        await waitFor(() => {
            expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);
        });
        expect(booking.status).toBe('APPROVED');
        expect(booking.approvedBy?.firstName).toBe('Kwame');
        // The payment countdown should now be visible to whoever views it.
        expect(screen.getByText(/payment deadline/i)).toBeInTheDocument();

        // ── Step 3: student submits their payment reference ────────────────
        setAuthUser(student);

        await user.click(
            await screen.findByRole('button', { name: /submit payment/i })
        );
        const paymentDialog = await screen.findByRole('dialog');
        await user.type(
            within(paymentDialog).getByLabelText(/transaction reference/i),
            'MoMo-20250601-XYZ789'
        );
        await user.type(
            within(paymentDialog).getByLabelText(/amount paid/i),
            '1500'
        );
        await user.click(
            within(paymentDialog).getByRole('button', {
                name: /submit payment reference/i,
            })
        );

        await waitFor(() => {
            expect(booking.paymentRef).toBe('MoMo-20250601-XYZ789');
        });
        await waitFor(() =>
            expect(screen.getByText(/payment submitted/i)).toBeInTheDocument()
        );

        // ── Step 4: manager checks the student in ──────────────────────────
        setAuthUser(manager);

        await user.click(
            await screen.findByRole('button', { name: /check in student/i })
        );
        const checkinDialog = await screen.findByRole('alertdialog');
        expect(
            within(checkinDialog).getByText(/MoMo-20250601-XYZ789/)
        ).toBeInTheDocument();
        await user.click(
            within(checkinDialog).getByRole('button', { name: /^check in$/i })
        );

        await waitFor(() => {
            expect(screen.getAllByText('Checked In').length).toBeGreaterThan(0);
        });
        expect(booking.status).toBe('CHECKED_IN');
        expect(booking.checkedInAt).not.toBeNull();

        // Terminal-for-this-lifecycle state: no more manager actions shown.
        await waitFor(() => {
            expect(
                screen.queryByRole('button', { name: /check in student/i })
            ).not.toBeInTheDocument();
        });
    });

    it('surfaces a rejection with its reason instead of progressing to payment', async () => {
        const user = userEvent.setup();
        const { handlers: rejectHandlers } = createBookingLifecycleHandlers({
            id: 'booking-2',
        });
        server.use(...rejectHandlers);

        const queryClient = createTestQueryClient();
        setAuthUser(manager);

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/bookings/booking-2']}>
                    <Routes>
                        <Route
                            path="/bookings/:id"
                            element={<BookingDetailPage />}
                        />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        );

        await user.click(
            await screen.findByRole('button', { name: /approve \/ reject/i })
        );
        const dialog = await screen.findByRole('dialog');
        await user.click(
            within(dialog).getByRole('button', { name: /^reject$/i })
        );
        await user.type(
            await within(dialog).findByLabelText(/rejection reason/i),
            'Room reassigned to another applicant.'
        );
        await user.click(
            within(dialog).getByRole('button', { name: /reject booking/i })
        );

        await waitFor(() => {
            expect(screen.getAllByText('Rejected').length).toBeGreaterThan(0);
        });
        expect(
            screen.getByText('Room reassigned to another applicant.')
        ).toBeInTheDocument();
        // Rejected is terminal — no action panel should render.
        await waitFor(() => {
            expect(
                screen.queryByRole('button', { name: /approve \/ reject/i })
            ).not.toBeInTheDocument();
        });
    });
});
