import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { WaitlistCard, WaitlistCardSkeleton } from './WaitlistCard';
import type { WaitlistDto } from '../types/waitlist.types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual =
        await vi.importActual<typeof import('react-router-dom')>(
            'react-router-dom'
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

const mockLeave = vi.fn();

vi.mock('../hooks/waitlist.hooks', () => ({
    useLeaveWaitlist: () => ({ mutate: mockLeave, isPending: false }),
}));

const baseEntry: WaitlistDto = {
    id: 'wl-1',
    hostelId: 'hostel-1',
    hostelName: 'Leroy Hostel',
    hostelImageUrl: '',
    roomType: 'DOUBLE',
    position: 3,
    academicYear: '2025/2026',
    semester: 'FIRST',
    joinedAt: '2025-06-01T10:00:00.000Z',
    notified: false,
};

describe('WaitlistCard', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
        mockLeave.mockClear();
    });

    it('renders the hostel name, room type, position, and period', () => {
        renderWithProviders(<WaitlistCard entry={baseEntry} />);
        expect(screen.getByText('Leroy Hostel')).toBeInTheDocument();
        expect(screen.getByText('Double')).toBeInTheDocument();
        expect(screen.getByText('#3')).toBeInTheDocument();
        expect(screen.getByText(/2025\/2026/)).toBeInTheDocument();
    });

    it('shows "Awaiting" and no notified banner when not yet notified', () => {
        renderWithProviders(<WaitlistCard entry={baseEntry} />);
        expect(screen.getByText('Awaiting')).toBeInTheDocument();
        expect(
            screen.queryByText(/a room has opened up/i)
        ).not.toBeInTheDocument();
    });

    it('shows the notified banner and status when the entry has been notified', () => {
        renderWithProviders(
            <WaitlistCard entry={{ ...baseEntry, notified: true }} />
        );
        expect(screen.getByText(/a room has opened up/i)).toBeInTheDocument();
        expect(screen.getByText('Notified')).toBeInTheDocument();
    });

    it('navigates to the hostel page when "View hostel" is clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(<WaitlistCard entry={baseEntry} />);
        await user.click(screen.getByRole('button', { name: /view hostel/i }));
        expect(mockNavigate).toHaveBeenCalledWith('/hostels/hostel-1');
    });

    it('opens a confirmation dialog before leaving the waitlist', async () => {
        const user = userEvent.setup();
        renderWithProviders(<WaitlistCard entry={baseEntry} />);

        await user.click(screen.getByRole('button', { name: /leave queue/i }));

        expect(
            await screen.findByText('Leave this waitlist?')
        ).toBeInTheDocument();
        expect(mockLeave).not.toHaveBeenCalled();
    });

    it('calls the leave mutation with the entry details on confirmation', async () => {
        const user = userEvent.setup();
        renderWithProviders(<WaitlistCard entry={baseEntry} />);

        await user.click(screen.getByRole('button', { name: /leave queue/i }));
        await screen.findByText('Leave this waitlist?');

        // Two "Leave queue"-labelled controls now exist: the card action and
        // the dialog's confirm button. The confirm button is the one inside
        // the alert dialog.
        const dialog = screen.getByRole('alertdialog');
        const confirmButton = within(dialog).getByRole('button', {
            name: /leave queue/i,
        });
        await user.click(confirmButton);

        expect(mockLeave).toHaveBeenCalledWith(
            {
                hostelId: 'hostel-1',
                payload: {
                    roomType: 'DOUBLE',
                    academicYear: '2025/2026',
                    semester: 'FIRST',
                },
            },
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });
});

describe('WaitlistCardSkeleton', () => {
    it('renders a loading placeholder marked aria-hidden', () => {
        const { container } = renderWithProviders(<WaitlistCardSkeleton />);
        expect(
            container.querySelector('[aria-hidden="true"]')
        ).toBeInTheDocument();
    });
});
