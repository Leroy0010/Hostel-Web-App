import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { CreateRoomForm } from './CreateRoomForm';

const mockMutate = vi.fn();
vi.mock('../hooks/room.hooks', () => ({
    useCreateRoom: () => ({ mutate: mockMutate, isPending: false }),
}));

const HOSTEL_ID = 'hostel-1';

/** A minimal valid JPEG File for driving the real ImageUpload file input. */
function makeImageFile(name = 'cover.jpg') {
    return new File(['fake-image-bytes'], name, { type: 'image/jpeg' });
}

/**
 * Uploads an image through the real (unmocked) ImageUpload component so the
 * form's `imageUrl` field becomes populated, exactly as a user would.
 */
async function uploadCoverImage(
    user: ReturnType<typeof userEvent.setup>,
    container: HTMLElement,
    url = 'https://example.com/room.jpg'
) {
    const fileInput = container.querySelector(
        'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(fileInput, makeImageFile());
    await waitFor(() =>
        expect(screen.getByAltText('Upload preview')).toHaveAttribute(
            'src',
            url
        )
    );
}

describe('CreateRoomForm', () => {
    const onUploadImage = vi
        .fn()
        .mockResolvedValue('https://example.com/room.jpg');

    beforeEach(() => {
        mockMutate.mockClear();
        onUploadImage.mockClear();
    });

    it('renders the empty dropzone and "no amenities" helper text by default', () => {
        renderWithProviders(
            <CreateRoomForm
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );
        expect(
            screen.getByText('Drag & drop or click to upload')
        ).toBeInTheDocument();
        expect(screen.getByText(/no amenities added/i)).toBeInTheDocument();
    });

    it('blocks submission and shows field errors when required fields are empty', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <CreateRoomForm
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );

        await user.click(screen.getByRole('button', { name: /create room/i }));

        expect(
            await screen.findByText('Please upload a room image')
        ).toBeInTheDocument();
        expect(screen.getByText('Room number is required')).toBeInTheDocument();
        expect(screen.getByText('Room type is required')).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it('uploads a cover image via onUploadImage and previews the result', async () => {
        const user = userEvent.setup();
        const { container } = renderWithProviders(
            <CreateRoomForm
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );

        await uploadCoverImage(user, container);
        expect(onUploadImage).toHaveBeenCalledTimes(1);
    });

    it('adds and removes amenity rows via the field array', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <CreateRoomForm
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );

        await user.click(screen.getByRole('button', { name: /^add$/i }));
        expect(
            screen.getByPlaceholderText(/e\.g\. air conditioning/i)
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: /remove amenity 1/i })
        );
        expect(
            screen.queryByPlaceholderText(/e\.g\. air conditioning/i)
        ).not.toBeInTheDocument();
        expect(screen.getByText(/no amenities added/i)).toBeInTheDocument();
    });

    it('submits the full payload with a chosen room type, image, and amenity', async () => {
        const user = userEvent.setup();
        const { container } = renderWithProviders(
            <CreateRoomForm
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );

        await uploadCoverImage(user, container);
        await user.type(screen.getByLabelText(/room number/i), 'A-101');

        await user.click(screen.getByLabelText(/room type/i));
        await user.click(await screen.findByRole('option', { name: 'Double' }));

        await user.type(screen.getByLabelText(/capacity/i), '2');
        await user.type(screen.getByLabelText(/price per semester/i), '1500');

        await user.click(screen.getByRole('button', { name: /^add$/i }));
        await user.type(
            screen.getByPlaceholderText(/e\.g\. air conditioning/i),
            'Air Conditioning'
        );

        await user.click(screen.getByRole('button', { name: /create room/i }));

        await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
        const [payload] = mockMutate.mock.calls[0];
        expect(payload).toEqual({
            roomNumber: 'A-101',
            roomType: 'DOUBLE',
            capacity: 2,
            pricePerSemester: '1500',
            imageUrl: 'https://example.com/room.jpg',
            amenities: [{ amenity: 'Air Conditioning' }],
        });
    });

    it('calls onSuccess with the new room id after a successful submit', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();
        mockMutate.mockImplementation((_payload, { onSuccess: cb }) =>
            cb({ id: 'room-99' })
        );

        const { container } = renderWithProviders(
            <CreateRoomForm
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
                onSuccess={onSuccess}
            />
        );

        await uploadCoverImage(user, container);
        await user.type(screen.getByLabelText(/room number/i), 'A-101');
        await user.click(screen.getByLabelText(/room type/i));
        await user.click(await screen.findByRole('option', { name: 'Single' }));
        await user.type(screen.getByLabelText(/capacity/i), '1');
        await user.type(screen.getByLabelText(/price per semester/i), '1000');
        await user.click(screen.getByRole('button', { name: /create room/i }));

        await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('room-99'));
    });

    it('maps a VALIDATION_FAILED server error back onto the matching field', async () => {
        const user = userEvent.setup();
        mockMutate.mockImplementation((_payload, { onError }) => {
            onError({
                code: 'VALIDATION_FAILED',
                message: 'Validation failed',
                details: { roomNumber: ['Room number already exists'] },
            });
        });

        const { container } = renderWithProviders(
            <CreateRoomForm
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );

        await uploadCoverImage(user, container);
        await user.type(screen.getByLabelText(/room number/i), 'A-101');
        await user.click(screen.getByLabelText(/room type/i));
        await user.click(await screen.findByRole('option', { name: 'Single' }));
        await user.type(screen.getByLabelText(/capacity/i), '1');
        await user.type(screen.getByLabelText(/price per semester/i), '1000');
        await user.click(screen.getByRole('button', { name: /create room/i }));

        expect(
            await screen.findByText('Room number already exists')
        ).toBeInTheDocument();
    });

    it('renders and wires the Cancel button only when onCancel is provided', async () => {
        const onCancel = vi.fn();
        const { rerender } = renderWithProviders(
            <CreateRoomForm
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
            />
        );
        expect(
            screen.queryByRole('button', { name: /cancel/i })
        ).not.toBeInTheDocument();

        rerender(
            <CreateRoomForm
                hostelId={HOSTEL_ID}
                onUploadImage={onUploadImage}
                onCancel={onCancel}
            />
        );
        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalled();
    });
});
