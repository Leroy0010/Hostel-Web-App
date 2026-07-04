import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { BookingCard, BookingCardSkeleton } from './BookingCard';
import type { BookingSummaryDto } from '../types/booking.types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual =
        await vi.importActual<typeof import('react-router-dom')>(
            'react-router-dom'
        );
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const baseBooking: BookingSummaryDto = {
    id: 'booking-1',
    studentId: 'student-1',
    studentName: 'Lexa Doe',
    roomId: 'room-1',
    roomNumber: 'A12',
    hostelName: 'Leroy Hostel',
    status: 'PENDING',
    academicYear: '2025/2026',
    semester: 'FIRST',
    isWaitlistDraft: false,
    requestedAt: '2025-06-01T10:00:00.000Z',
    paymentExpiresAt: null,
};

describe('BookingCard', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    it('renders the hostel name, room number, and status', () => {
        renderWithProviders(<BookingCard booking={baseBooking} />);
        expect(screen.getByText('Leroy Hostel')).toBeInTheDocument();
        expect(screen.getByText('Room A12')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('renders the academic year and semester', () => {
        renderWithProviders(<BookingCard booking={baseBooking} />);
        expect(screen.getByText(/2025\/2026/)).toBeInTheDocument();
        expect(screen.getByText(/1st Semester/)).toBeInTheDocument();
    });

    it('navigates to the booking detail page when clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(<BookingCard booking={baseBooking} />);

        await user.click(
            screen.getByRole('button', { name: /view booking for room a12/i })
        );

        expect(mockNavigate).toHaveBeenCalledWith('/bookings/booking-1');
    });

    it('does not show a payment countdown when there is no deadline', () => {
        renderWithProviders(
            <BookingCard
                booking={{
                    ...baseBooking,
                    status: 'APPROVED',
                    paymentExpiresAt: null,
                }}
            />
        );
        expect(screen.queryByText(/payment deadline/i)).not.toBeInTheDocument();
    });

    it('shows a payment countdown only when APPROVED with a deadline', () => {
        renderWithProviders(
            <BookingCard
                booking={{
                    ...baseBooking,
                    status: 'APPROVED',
                    paymentExpiresAt: '2099-01-01T00:00:00.000Z',
                }}
            />
        );
        expect(screen.getByText(/payment deadline/i)).toBeInTheDocument();
    });

    it('does not show a payment countdown for non-APPROVED statuses even with a deadline', () => {
        renderWithProviders(
            <BookingCard
                booking={{
                    ...baseBooking,
                    status: 'CHECKED_IN',
                    paymentExpiresAt: '2099-01-01T00:00:00.000Z',
                }}
            />
        );
        expect(screen.queryByText(/payment deadline/i)).not.toBeInTheDocument();
    });
});

describe('BookingCardSkeleton', () => {
    it('renders a loading placeholder marked aria-hidden', () => {
        const { container } = renderWithProviders(<BookingCardSkeleton />);
        expect(
            container.querySelector('[aria-hidden="true"]')
        ).toBeInTheDocument();
    });
});
