import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { SubmitPaymentForm } from './SubmitPaymentForm';

const mockMutate = vi.fn();

vi.mock('../hooks/booking.hooks', () => ({
    useSubmitPayment: () => ({ mutate: mockMutate, isPending: false }),
}));

const BOOKING_ID = '11111111-1111-4111-8111-111111111111';

describe('SubmitPaymentForm', () => {
    beforeEach(() => {
        mockMutate.mockClear();
    });

    it('renders the payment reference and amount fields empty by default', () => {
        renderWithProviders(<SubmitPaymentForm bookingId={BOOKING_ID} />);
        expect(screen.getByLabelText(/transaction reference/i)).toHaveValue('');
        expect(screen.getByLabelText(/amount paid/i)).toHaveValue(null);
    });

    it('blocks submission and shows both required-field errors when empty', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SubmitPaymentForm bookingId={BOOKING_ID} />);

        await user.click(
            screen.getByRole('button', { name: /submit payment reference/i })
        );

        expect(
            await screen.findByText('Payment reference is required')
        ).toBeInTheDocument();
        expect(screen.getByText('Amount paid is required')).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it('rejects a zero or negative amount with a friendly message', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SubmitPaymentForm bookingId={BOOKING_ID} />);

        await user.type(
            screen.getByLabelText(/transaction reference/i),
            'MoMo-20250115-ABC123'
        );
        await user.type(screen.getByLabelText(/amount paid/i), '0');
        await user.click(
            screen.getByRole('button', { name: /submit payment reference/i })
        );

        expect(
            await screen.findByText('Amount paid must be greater than 0')
        ).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it('submits the trimmed reference and amount on valid input', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();
        renderWithProviders(
            <SubmitPaymentForm bookingId={BOOKING_ID} onSuccess={onSuccess} />
        );

        await user.type(
            screen.getByLabelText(/transaction reference/i),
            'MoMo-20250115-ABC123'
        );
        await user.type(screen.getByLabelText(/amount paid/i), '1500.5');
        await user.click(
            screen.getByRole('button', { name: /submit payment reference/i })
        );

        await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
        expect(mockMutate.mock.calls[0][0]).toEqual({
            paymentRef: 'MoMo-20250115-ABC123',
            amountPaid: '1500.5',
        });
    });

    it('calls onSuccess after a successful mutation', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();
        mockMutate.mockImplementation((_payload, { onSuccess: cb }) => cb());

        renderWithProviders(
            <SubmitPaymentForm bookingId={BOOKING_ID} onSuccess={onSuccess} />
        );

        await user.type(
            screen.getByLabelText(/transaction reference/i),
            'MoMo-20250115-ABC123'
        );
        await user.type(screen.getByLabelText(/amount paid/i), '200');
        await user.click(
            screen.getByRole('button', { name: /submit payment reference/i })
        );

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    });

    it('maps a VALIDATION_FAILED server error back onto the matching field', async () => {
        const user = userEvent.setup();
        mockMutate.mockImplementation((_payload, { onError }) => {
            onError({
                code: 'VALIDATION_FAILED',
                message: 'Validation failed',
                details: {
                    paymentRef: ['This reference has already been used'],
                },
            });
        });

        renderWithProviders(<SubmitPaymentForm bookingId={BOOKING_ID} />);

        await user.type(
            screen.getByLabelText(/transaction reference/i),
            'DUPLICATE-REF'
        );
        await user.type(screen.getByLabelText(/amount paid/i), '200');
        await user.click(
            screen.getByRole('button', { name: /submit payment reference/i })
        );

        expect(
            await screen.findByText('This reference has already been used')
        ).toBeInTheDocument();
    });

    it('renders and wires the Cancel button only when onCancel is provided', async () => {
        const onCancel = vi.fn();
        const { rerender } = renderWithProviders(
            <SubmitPaymentForm bookingId={BOOKING_ID} />
        );
        expect(
            screen.queryByRole('button', { name: /cancel/i })
        ).not.toBeInTheDocument();

        rerender(
            <SubmitPaymentForm bookingId={BOOKING_ID} onCancel={onCancel} />
        );
        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalled();
    });
});
