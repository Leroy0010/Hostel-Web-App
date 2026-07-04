import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { ActionBookingForm } from './ActionBookingForm';

const mockMutate = vi.fn();

vi.mock('../hooks/booking.hooks', () => ({
    useActionBooking: () => ({ mutate: mockMutate, isPending: false }),
}));

describe('ActionBookingForm', () => {
    beforeEach(() => {
        mockMutate.mockClear();
    });

    it('defaults to the approve decision with the grace period field visible', () => {
        renderWithProviders(<ActionBookingForm bookingId="b-1" roomId="r-1" />);
        expect(
            screen.getByRole('button', { name: /approve$/i })
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByLabelText(/payment grace period/i)
        ).toBeInTheDocument();
        expect(
            screen.queryByLabelText(/rejection reason/i)
        ).not.toBeInTheDocument();
    });

    it('switches to the reject decision and swaps in the reason textarea', async () => {
        const user = userEvent.setup();
        renderWithProviders(<ActionBookingForm bookingId="b-1" roomId="r-1" />);

        await user.click(screen.getByRole('button', { name: /^reject$/i }));

        expect(
            screen.getByRole('button', { name: /^reject$/i })
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            await screen.findByLabelText(/rejection reason/i)
        ).toBeInTheDocument();
        expect(
            screen.queryByLabelText(/payment grace period/i)
        ).not.toBeInTheDocument();
    });

    it('submits an approve payload with the default grace period', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();
        renderWithProviders(
            <ActionBookingForm
                bookingId="b-1"
                roomId="r-1"
                onSuccess={onSuccess}
            />
        );

        await user.click(
            screen.getByRole('button', { name: /approve booking/i })
        );

        await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
        const [payload] = mockMutate.mock.calls[0];
        expect(payload).toEqual({ approved: true, gracePeriodHours: 48 });
    });

    it('submits a custom grace period when changed', async () => {
        const user = userEvent.setup();
        renderWithProviders(<ActionBookingForm bookingId="b-1" roomId="r-1" />);

        const graceInput = screen.getByLabelText(/payment grace period/i);
        await user.clear(graceInput);
        await user.type(graceInput, '12');
        await user.click(
            screen.getByRole('button', { name: /approve booking/i })
        );

        await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
        expect(mockMutate.mock.calls[0][0]).toEqual({
            approved: true,
            gracePeriodHours: 12,
        });
    });

    it('blocks submission and shows an error when rejecting without a reason', async () => {
        const user = userEvent.setup();
        renderWithProviders(<ActionBookingForm bookingId="b-1" roomId="r-1" />);

        await user.click(screen.getByRole('button', { name: /^reject$/i }));
        await user.click(
            screen.getByRole('button', { name: /reject booking/i })
        );

        expect(
            await screen.findByText(/rejection reason is required/i)
        ).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it('submits a reject payload with the provided reason', async () => {
        const user = userEvent.setup();
        renderWithProviders(<ActionBookingForm bookingId="b-1" roomId="r-1" />);

        await user.click(screen.getByRole('button', { name: /^reject$/i }));
        await user.type(
            await screen.findByLabelText(/rejection reason/i),
            'Room already assigned to another student.'
        );
        await user.click(
            screen.getByRole('button', { name: /reject booking/i })
        );

        await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
        expect(mockMutate.mock.calls[0][0]).toEqual({
            approved: false,
            rejectedReason: 'Room already assigned to another student.',
        });
    });

    it('clears the reason validation error when switching back to approve', async () => {
        const user = userEvent.setup();
        renderWithProviders(<ActionBookingForm bookingId="b-1" roomId="r-1" />);

        await user.click(screen.getByRole('button', { name: /^reject$/i }));
        await user.click(
            screen.getByRole('button', { name: /reject booking/i })
        );
        expect(
            await screen.findByText(/rejection reason is required/i)
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /approve$/i }));
        await waitFor(() =>
            expect(
                screen.queryByText(/rejection reason is required/i)
            ).not.toBeInTheDocument()
        );
    });

    it('renders and wires the Cancel button only when onCancel is provided', async () => {
        const onCancel = vi.fn();
        const { rerender } = renderWithProviders(
            <ActionBookingForm bookingId="b-1" roomId="r-1" />
        );
        expect(
            screen.queryByRole('button', { name: /cancel/i })
        ).not.toBeInTheDocument();

        rerender(
            <ActionBookingForm
                bookingId="b-1"
                roomId="r-1"
                onCancel={onCancel}
            />
        );
        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalled();
    });
});
