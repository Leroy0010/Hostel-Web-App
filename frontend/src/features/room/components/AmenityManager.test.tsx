import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { AmenityManager } from './AmenityManager';
import type { AmenityDto } from '../types/room.types';

const mockReplaceAll = vi.fn();
const mockDeleteOne = vi.fn();

vi.mock('../hooks/room.hooks', () => ({
    useReplaceAmenities: () => ({
        mutate: mockReplaceAll,
        isPending: false,
    }),
    useDeleteAmenity: () => ({ mutate: mockDeleteOne, isPending: false }),
}));

const ROOM_ID = 'room-1';
const HOSTEL_ID = 'hostel-1';

const existingAmenities: AmenityDto[] = [
    { id: 'am-1', amenity: 'Air Conditioning', imageUrl: null },
    { id: 'am-2', amenity: 'Wi-Fi', imageUrl: null },
];

const onUploadImage = vi.fn().mockResolvedValue('https://example.com/icon.png');

describe('AmenityManager', () => {
    beforeEach(() => {
        mockReplaceAll.mockClear();
        mockDeleteOne.mockClear();
        onUploadImage.mockClear();
    });

    it('renders each existing amenity as a chip', () => {
        renderWithProviders(
            <AmenityManager
                roomId={ROOM_ID}
                hostelId={HOSTEL_ID}
                currentAmenities={existingAmenities}
                onUploadImage={onUploadImage}
            />
        );
        expect(screen.getByText('Air Conditioning')).toBeInTheDocument();
        expect(screen.getByText('Wi-Fi')).toBeInTheDocument();
    });

    it('shows a helper message when there are no amenities yet', () => {
        renderWithProviders(
            <AmenityManager
                roomId={ROOM_ID}
                hostelId={HOSTEL_ID}
                currentAmenities={[]}
                onUploadImage={onUploadImage}
            />
        );
        expect(screen.getByText(/no amenities attached/i)).toBeInTheDocument();
    });

    it('deletes a single amenity immediately on click (no confirmation)', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AmenityManager
                roomId={ROOM_ID}
                hostelId={HOSTEL_ID}
                currentAmenities={existingAmenities}
                onUploadImage={onUploadImage}
            />
        );

        await user.click(
            screen.getByRole('button', { name: /remove air conditioning/i })
        );

        expect(mockDeleteOne).toHaveBeenCalledWith('am-1');
    });

    it('keeps the batch-replace form collapsed until "Replace all" is clicked', () => {
        renderWithProviders(
            <AmenityManager
                roomId={ROOM_ID}
                hostelId={HOSTEL_ID}
                currentAmenities={existingAmenities}
                onUploadImage={onUploadImage}
            />
        );
        expect(
            screen.queryByPlaceholderText(/label, e\.g\. air conditioning/i)
        ).not.toBeInTheDocument();
    });

    it('opens the replace form pre-populated with the existing amenities', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AmenityManager
                roomId={ROOM_ID}
                hostelId={HOSTEL_ID}
                currentAmenities={existingAmenities}
                onUploadImage={onUploadImage}
            />
        );

        await user.click(screen.getByRole('button', { name: /replace all/i }));

        const inputs = await screen.findAllByPlaceholderText(
            /label, e\.g\. air conditioning/i
        );
        expect(inputs).toHaveLength(2);
        expect(inputs[0]).toHaveValue('Air Conditioning');
        expect(inputs[1]).toHaveValue('Wi-Fi');
    });

    it('adds a new empty row when "Add row" is clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AmenityManager
                roomId={ROOM_ID}
                hostelId={HOSTEL_ID}
                currentAmenities={existingAmenities}
                onUploadImage={onUploadImage}
            />
        );

        await user.click(screen.getByRole('button', { name: /replace all/i }));
        await screen.findAllByPlaceholderText(/label, e\.g\./i);
        await user.click(screen.getByRole('button', { name: /add row/i }));

        const inputs = await screen.findAllByPlaceholderText(
            /label, e\.g\. air conditioning/i
        );
        expect(inputs).toHaveLength(3);
        expect(inputs[2]).toHaveValue('');
    });

    it('removes a row when its trash icon is clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AmenityManager
                roomId={ROOM_ID}
                hostelId={HOSTEL_ID}
                currentAmenities={existingAmenities}
                onUploadImage={onUploadImage}
            />
        );

        await user.click(screen.getByRole('button', { name: /replace all/i }));
        await screen.findAllByPlaceholderText(/label, e\.g\./i);

        await user.click(screen.getByRole('button', { name: /remove row 1/i }));

        const inputs = await screen.findAllByPlaceholderText(
            /label, e\.g\. air conditioning/i
        );
        expect(inputs).toHaveLength(1);
        expect(inputs[0]).toHaveValue('Wi-Fi');
    });

    it('blocks submission when a row label is cleared', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AmenityManager
                roomId={ROOM_ID}
                hostelId={HOSTEL_ID}
                currentAmenities={existingAmenities}
                onUploadImage={onUploadImage}
            />
        );

        await user.click(screen.getByRole('button', { name: /replace all/i }));
        const inputs = await screen.findAllByPlaceholderText(
            /label, e\.g\. air conditioning/i
        );
        await user.clear(inputs[0]);
        await user.click(
            screen.getByRole('button', { name: /save amenities/i })
        );

        expect(await screen.findByText('Label required')).toBeInTheDocument();
        expect(mockReplaceAll).not.toHaveBeenCalled();
    });

    it('submits the full replacement list on save', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AmenityManager
                roomId={ROOM_ID}
                hostelId={HOSTEL_ID}
                currentAmenities={existingAmenities}
                onUploadImage={onUploadImage}
            />
        );

        await user.click(screen.getByRole('button', { name: /replace all/i }));
        await screen.findAllByPlaceholderText(/label, e\.g\./i);
        await user.click(
            screen.getByRole('button', { name: /save amenities/i })
        );

        await waitFor(() => expect(mockReplaceAll).toHaveBeenCalledTimes(1));
        const [payload] = mockReplaceAll.mock.calls[0];
        expect(payload).toEqual([
            { amenity: 'Air Conditioning' },
            { amenity: 'Wi-Fi' },
        ]);
    });

    it('collapses the replace form again after a successful save', async () => {
        const user = userEvent.setup();
        mockReplaceAll.mockImplementation((_payload, { onSuccess }) =>
            onSuccess()
        );

        renderWithProviders(
            <AmenityManager
                roomId={ROOM_ID}
                hostelId={HOSTEL_ID}
                currentAmenities={existingAmenities}
                onUploadImage={onUploadImage}
            />
        );

        await user.click(screen.getByRole('button', { name: /replace all/i }));
        await screen.findAllByPlaceholderText(/label, e\.g\./i);
        await user.click(
            screen.getByRole('button', { name: /save amenities/i })
        );

        await waitFor(() =>
            expect(
                screen.queryByPlaceholderText(/label, e\.g\./i)
            ).not.toBeInTheDocument()
        );
    });

    it('toggles the button label between "Replace all" and "Cancel replace"', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AmenityManager
                roomId={ROOM_ID}
                hostelId={HOSTEL_ID}
                currentAmenities={existingAmenities}
                onUploadImage={onUploadImage}
            />
        );

        const toggle = screen.getByRole('button', { name: /replace all/i });
        await user.click(toggle);
        expect(
            screen.getByRole('button', { name: /cancel replace/i })
        ).toBeInTheDocument();
    });
});
