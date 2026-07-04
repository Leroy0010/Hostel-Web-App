import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { RoomPreviewCard, RoomPreviewCardSkeleton } from './RoomPreviewCard';
import type { RoomDisplayDto } from '@/features/hostel/types/hostel.types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual =
        await vi.importActual<typeof import('react-router-dom')>(
            'react-router-dom'
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

const room: RoomDisplayDto = {
    id: 'room-2',
    roomNumber: 'B04',
    roomType: 'SINGLE',
    capacity: 1,
    pricePerSemester: 2000,
    floorNumber: 1,
    imageUrl: '',
    availablePeriods: [],
};

const HOSTEL_ID = 'hostel-1';

describe('RoomPreviewCard', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    it('renders the room number, type + capacity, and formatted price', () => {
        renderWithProviders(
            <RoomPreviewCard room={room} hostelId={HOSTEL_ID} />
        );
        expect(screen.getByText('Room B04')).toBeInTheDocument();
        expect(screen.getByText('Single · Cap. 1')).toBeInTheDocument();
        expect(screen.getByText('₵2,000.00')).toBeInTheDocument();
    });

    it('shows "Not available" via the compact badge when there are no open periods', () => {
        renderWithProviders(
            <RoomPreviewCard room={room} hostelId={HOSTEL_ID} />
        );
        expect(screen.getByText('Not available')).toBeInTheDocument();
    });

    it('navigates to the room detail page when clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <RoomPreviewCard room={room} hostelId={HOSTEL_ID} />
        );

        await user.click(
            screen.getByRole('button', { name: /view room b04/i })
        );

        expect(mockNavigate).toHaveBeenCalledWith(
            '/hostels/hostel-1/rooms/room-2'
        );
    });
});

describe('RoomPreviewCardSkeleton', () => {
    it('renders a loading placeholder marked aria-hidden', () => {
        const { container } = renderWithProviders(<RoomPreviewCardSkeleton />);
        expect(
            container.querySelector('[aria-hidden="true"]')
        ).toBeInTheDocument();
    });
});
