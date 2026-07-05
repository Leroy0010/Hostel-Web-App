import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { UpdateRoomForm } from './UpdateRoomForm';
import type { RoomDto } from '../types/room.types';

const mockUpdateDetails = vi.fn();
const mockUpdateStatus = vi.fn();

vi.mock('../hooks/room.hooks', () => ({
    useUpdateRoom: () => ({
        mutate: mockUpdateDetails,
        isPending: false,
    }),
    useUpdateRoomStatus: () => ({
        mutate: mockUpdateStatus,
        isPending: false,
    }),
}));

const HOSTEL_ID = 'hostel-1';

const baseRoom: RoomDto = {
    id: 'room-1',
    hostelId: HOSTEL_ID,
    hostelName: 'Leroy Hostel',
    roomNumber: 'A12',
    roomType: 'DOUBLE',
    capacity: 2,
    currentOccupancy: 1,
    bedsAvailable: 1,
    pricePerSemester: '1500.00',
    status: 'AVAILABLE',
    floorNumber: 3,
    imageUrl: 'https://example.com/existing.jpg',
    amenities: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
};

const onUploadImage = vi.fn().mockResolvedValue('https://example.com/new.jpg');

describe('UpdateRoomForm', () => {
    beforeEach(() => {
        mockUpdateDetails.mockClear();
        mockUpdateStatus.mockClear();
        onUploadImage.mockClear();
    });

    it('pre-populates all fields from the given room', () => {
        renderWithProviders(
            <UpdateRoomForm
                room={baseRoom}
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );
        expect(screen.getByLabelText(/room number/i)).toHaveValue('A12');
        expect(screen.getByLabelText(/capacity/i)).toHaveValue(2);
        expect(screen.getByLabelText(/price per semester/i)).toHaveValue(1500);
        expect(screen.getByLabelText(/floor number/i)).toHaveValue(3);
        expect(screen.getAllByText('Double').length).toBeGreaterThan(0);
    });

    it('submits an empty patch payload when nothing was changed', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <UpdateRoomForm
                room={baseRoom}
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );

        await user.click(screen.getByRole('button', { name: /save changes/i }));

        await waitFor(() => expect(mockUpdateDetails).toHaveBeenCalledTimes(1));
        expect(mockUpdateDetails.mock.calls[0][0]).toEqual({});
    });

    it('includes only the field(s) that were actually changed in the payload', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <UpdateRoomForm
                room={baseRoom}
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );

        const roomNumberInput = screen.getByLabelText(/room number/i);
        await user.clear(roomNumberInput);
        await user.type(roomNumberInput, 'B04');

        await user.click(screen.getByRole('button', { name: /save changes/i }));

        await waitFor(() => expect(mockUpdateDetails).toHaveBeenCalledTimes(1));
        expect(mockUpdateDetails.mock.calls[0][0]).toEqual({
            roomNumber: 'B04',
        });
    });

    it('includes the new price only when it differs from the current one', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <UpdateRoomForm
                room={baseRoom}
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );

        const priceInput = screen.getByLabelText(/price per semester/i);
        await user.clear(priceInput);
        await user.type(priceInput, '1750');

        await user.click(screen.getByRole('button', { name: /save changes/i }));

        await waitFor(() => expect(mockUpdateDetails).toHaveBeenCalledTimes(1));
        expect(mockUpdateDetails.mock.calls[0][0]).toEqual({
            pricePerSemester: '1750',
        });
    });

    it('calls onSuccess with the updated room after a successful details save', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();
        const updatedRoom = { ...baseRoom, roomNumber: 'B04' };
        mockUpdateDetails.mockImplementation((_payload, { onSuccess: cb }) =>
            cb(updatedRoom)
        );

        renderWithProviders(
            <UpdateRoomForm
                room={baseRoom}
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
                onSuccess={onSuccess}
            />
        );

        await user.click(screen.getByRole('button', { name: /save changes/i }));
        await waitFor(() =>
            expect(onSuccess).toHaveBeenCalledWith(updatedRoom)
        );
    });

    it('maps a VALIDATION_FAILED server error back onto the matching field', async () => {
        const user = userEvent.setup();
        mockUpdateDetails.mockImplementation((_payload, { onError }) => {
            onError({
                code: 'VALIDATION_FAILED',
                message: 'Validation failed',
                details: { roomNumber: ['Room number already exists'] },
            });
        });

        renderWithProviders(
            <UpdateRoomForm
                room={baseRoom}
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );

        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(
            await screen.findByText('Room number already exists')
        ).toBeInTheDocument();
    });

    it('pre-populates and submits the operational status independently of the details form', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <UpdateRoomForm
                room={baseRoom}
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );

        await user.click(screen.getByLabelText(/^status$/i));
        await user.click(
            await screen.findByRole('option', { name: 'Under Maintenance' })
        );
        await user.click(screen.getByRole('button', { name: /^update$/i }));

        await waitFor(() => expect(mockUpdateStatus).toHaveBeenCalledTimes(1));
        expect(mockUpdateStatus.mock.calls[0][0]).toBe('UNDER_MAINTENANCE');
        // The details mutation must not fire from the status form's submit.
        expect(mockUpdateDetails).not.toHaveBeenCalled();
    });

    it('resets the details form when the room prop changes', () => {
        const { rerender } = renderWithProviders(
            <UpdateRoomForm
                room={baseRoom}
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );
        expect(screen.getByLabelText(/room number/i)).toHaveValue('A12');

        const otherRoom: RoomDto = {
            ...baseRoom,
            id: 'room-2',
            roomNumber: 'C09',
        };
        rerender(
            <UpdateRoomForm
                room={otherRoom}
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );
        expect(screen.getByLabelText(/room number/i)).toHaveValue('C09');
    });

    it('renders and wires the Cancel button only when onCancel is provided', async () => {
        const onCancel = vi.fn();
        const { rerender } = renderWithProviders(
            <UpdateRoomForm
                room={baseRoom}
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );
        expect(
            screen.queryByRole('button', { name: /^cancel$/i })
        ).not.toBeInTheDocument();

        rerender(
            <UpdateRoomForm
                room={baseRoom}
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
                onCancel={onCancel}
            />
        );
        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /^cancel$/i }));
        expect(onCancel).toHaveBeenCalled();
    });
});
