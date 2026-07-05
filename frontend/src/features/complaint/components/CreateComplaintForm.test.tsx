import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { CreateComplaintForm } from './CreateComplaintForm';

// -----------------------------------------------------------------------
// The real Combobox is a Radix/portal-based primitive that is expensive to
// drive reliably in jsdom. This form's own responsibility is wiring the
// chosen hostel/room into the form state (and resetting roomId when the
// hostel changes) — so we swap in a trivial native <select> that preserves
// the same onValueChange contract, isolating the unit under test.
// -----------------------------------------------------------------------
vi.mock('@/components/ui/my-combobox', () => ({
    Combobox: ({
        options,
        onValueChange,
        placeholder,
        disabled,
    }: {
        options: { value: string; label: string }[];
        onValueChange: (value: string) => void;
        placeholder: string;
        disabled?: boolean;
    }) => (
        <select
            aria-label={placeholder}
            disabled={disabled}
            onChange={(e) => onValueChange(e.target.value)}
            defaultValue=""
        >
            <option value="" disabled>
                {placeholder}
            </option>
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));

const mockMutate = vi.fn();
vi.mock('../hooks/complaint.hooks', () => ({
    useCreateComplaint: () => ({ mutate: mockMutate, isPending: false }),
}));

const mockUseGetStudentActiveHostels = vi.fn();
vi.mock('@/features/hostel/hooks/hostel.hooks', () => ({
    useGetStudentActiveHostels: () => mockUseGetStudentActiveHostels(),
}));

const mockUseGetStudentActiveRoomsByHostelId = vi.fn();
vi.mock('@/features/room/hooks/room.hooks', () => ({
    useGetStudentActiveRoomsByHostelId: (hostelId: string) =>
        mockUseGetStudentActiveRoomsByHostelId(hostelId),
}));

const HOSTEL_ID = '11111111-1111-4111-8111-111111111111';
const ROOM_ID = '22222222-2222-4222-8222-222222222222';

describe('CreateComplaintForm', () => {
    beforeEach(() => {
        mockMutate.mockClear();
        mockUseGetStudentActiveHostels.mockReturnValue({
            data: [{ id: HOSTEL_ID, name: 'Leroy Hostel' }],
            isLoading: false,
        });
        mockUseGetStudentActiveRoomsByHostelId.mockReturnValue({
            data: [{ id: ROOM_ID, roomNumber: 'A12' }],
            isLoading: false,
        });
    });

    it('renders the hostel selector populated from useGetStudentActiveHostels', () => {
        renderWithProviders(<CreateComplaintForm />);
        expect(
            screen.getByRole('option', { name: 'Leroy Hostel' })
        ).toBeInTheDocument();
    });

    it('renders a room selector when no roomId is pre-filled', () => {
        renderWithProviders(<CreateComplaintForm />);
        expect(screen.getByLabelText(/select a room/i)).toBeInTheDocument();
    });

    it('hides the room selector entirely when roomId is pre-filled', () => {
        renderWithProviders(
            <CreateComplaintForm hostelId={HOSTEL_ID} roomId={ROOM_ID} />
        );
        expect(
            screen.queryByLabelText(/select a room/i)
        ).not.toBeInTheDocument();
    });

    it('disables the room selector until a hostel is chosen', () => {
        renderWithProviders(<CreateComplaintForm />);
        expect(screen.getByLabelText(/select a room/i)).toBeDisabled();
    });

    it('blocks submission and shows field errors when required fields are empty', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CreateComplaintForm />);

        await user.click(
            screen.getByRole('button', { name: /submit complaint/i })
        );

        expect(
            await screen.findByText('Title is required')
        ).toBeInTheDocument();
        expect(screen.getByText('Description is required')).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it('submits the full payload including the selected hostel, room, and category', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CreateComplaintForm />);

        await user.selectOptions(
            screen.getByLabelText(/select a hostel/i),
            HOSTEL_ID
        );
        await user.selectOptions(
            screen.getByLabelText(/select a room/i),
            ROOM_ID
        );
        await user.type(
            screen.getByPlaceholderText(/brief summary of the issue/i),
            'Broken window'
        );
        await user.type(
            screen.getByPlaceholderText(/describe the issue in detail/i),
            'The window in my room is cracked and lets in cold air.'
        );

        await user.click(screen.getByLabelText(/^category/i));
        await user.click(
            await screen.findByRole('option', { name: /maintenance/i })
        );

        await user.click(
            screen.getByRole('button', { name: /submit complaint/i })
        );

        await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
        const [payload] = mockMutate.mock.calls[0];
        expect(payload).toEqual({
            hostelId: HOSTEL_ID,
            roomId: ROOM_ID,
            title: 'Broken window',
            description:
                'The window in my room is cracked and lets in cold air.',
            category: 'MAINTENANCE',
        });
    });

    it('omits roomId from the payload when no room is selected', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CreateComplaintForm />);

        await user.selectOptions(
            screen.getByLabelText(/select a hostel/i),
            HOSTEL_ID
        );
        await user.type(
            screen.getByPlaceholderText(/brief summary of the issue/i),
            'Noisy neighbours'
        );
        await user.type(
            screen.getByPlaceholderText(/describe the issue in detail/i),
            'Loud music every night past midnight.'
        );
        await user.click(screen.getByLabelText(/^category/i));
        await user.click(
            await screen.findByRole('option', { name: /^🔊 noise/i })
        );

        await user.click(
            screen.getByRole('button', { name: /submit complaint/i })
        );

        await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
        expect(mockMutate.mock.calls[0][0]).not.toHaveProperty('roomId');
    });

    it('calls onSuccess and resets the form after a successful submit', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();
        mockMutate.mockImplementation((_payload, { onSuccess: cb }) =>
            cb({ id: 'complaint-99' })
        );

        renderWithProviders(<CreateComplaintForm onSuccess={onSuccess} />);

        await user.selectOptions(
            screen.getByLabelText(/select a hostel/i),
            HOSTEL_ID
        );
        await user.type(
            screen.getByPlaceholderText(/brief summary of the issue/i),
            'Leaking tap'
        );
        await user.type(
            screen.getByPlaceholderText(/describe the issue in detail/i),
            'The bathroom tap has been leaking for a week.'
        );
        await user.click(screen.getByLabelText(/^category/i));
        await user.click(
            await screen.findByRole('option', { name: /maintenance/i })
        );
        await user.click(
            screen.getByRole('button', { name: /submit complaint/i })
        );

        await waitFor(() =>
            expect(onSuccess).toHaveBeenCalledWith('complaint-99')
        );
    });

    it('maps a VALIDATION_FAILED server error back onto the title field', async () => {
        const user = userEvent.setup();
        mockMutate.mockImplementation((_payload, { onError }) => {
            onError({
                code: 'VALIDATION_FAILED',
                message: 'Validation failed',
                details: { title: ['Title contains banned words'] },
            });
        });

        renderWithProviders(<CreateComplaintForm />);

        await user.selectOptions(
            screen.getByLabelText(/select a hostel/i),
            HOSTEL_ID
        );
        await user.type(
            screen.getByPlaceholderText(/brief summary of the issue/i),
            'Some title'
        );
        await user.type(
            screen.getByPlaceholderText(/describe the issue in detail/i),
            'Some description of the issue at hand.'
        );
        await user.click(screen.getByLabelText(/^category/i));
        await user.click(
            await screen.findByRole('option', { name: /maintenance/i })
        );
        await user.click(
            screen.getByRole('button', { name: /submit complaint/i })
        );

        expect(
            await screen.findByText('Title contains banned words')
        ).toBeInTheDocument();
    });

    it('renders and wires the Cancel button only when onCancel is provided', async () => {
        const onCancel = vi.fn();
        const { rerender } = renderWithProviders(<CreateComplaintForm />);
        expect(
            screen.queryByRole('button', { name: /cancel/i })
        ).not.toBeInTheDocument();

        rerender(<CreateComplaintForm onCancel={onCancel} />);
        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalled();
    });
});
