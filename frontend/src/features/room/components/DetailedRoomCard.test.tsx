import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { DetailedRoomCard, DetailedRoomCardSkeleton } from './DetailedRoomCard';
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
    id: 'room-1',
    roomNumber: 'A12',
    roomType: 'DOUBLE',
    capacity: 2,
    pricePerSemester: 1500,
    floorNumber: 3,
    imageUrl: '',
    availablePeriods: [{ academicYear: '2025/2026', semester: 'FIRST' }],
};

const HOSTEL_ID = 'hostel-1';

describe('DetailedRoomCard', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    it('renders the room number, type, floor, capacity, and formatted price', () => {
        renderWithProviders(
            <DetailedRoomCard room={room} hostelId={HOSTEL_ID} />
        );
        expect(screen.getByText('Room A12')).toBeInTheDocument();
        expect(screen.getByText('Double')).toBeInTheDocument();
        expect(screen.getByText('Fl. 3')).toBeInTheDocument();
        expect(screen.getByText('Capacity: 2')).toBeInTheDocument();
        expect(screen.getByText('₵1,500.00')).toBeInTheDocument();
    });

    it('renders the available-periods badge in compact mode', () => {
        renderWithProviders(
            <DetailedRoomCard room={room} hostelId={HOSTEL_ID} />
        );
        expect(
            screen.getByText('2025/2026 · First Sem open')
        ).toBeInTheDocument();
    });

    it('navigates to the room detail page when clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <DetailedRoomCard room={room} hostelId={HOSTEL_ID} />
        );

        await user.click(
            screen.getByRole('button', {
                name: /view details for room a12/i,
            })
        );

        expect(mockNavigate).toHaveBeenCalledWith(
            '/hostels/hostel-1/rooms/room-1'
        );
    });

    it('falls back to a placeholder image when imageUrl is empty', () => {
        renderWithProviders(
            <DetailedRoomCard room={room} hostelId={HOSTEL_ID} />
        );
        const img = screen.getByAltText('Room A12') as HTMLImageElement;
        expect(img.src).toContain('placehold.co');
    });
});

describe('DetailedRoomCardSkeleton', () => {
    it('renders a loading placeholder marked aria-hidden', () => {
        const { container } = renderWithProviders(<DetailedRoomCardSkeleton />);
        expect(
            container.querySelector('[aria-hidden="true"]')
        ).toBeInTheDocument();
    });
});
