import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { UpdateComplaintStatusForm } from './UpdateComplaintStatusForm';

const mockMutate = vi.fn();

vi.mock('../hooks/complaint.hooks', () => ({
    useUpdateComplaintStatus: () => ({
        mutate: mockMutate,
        isPending: false,
    }),
}));

describe('UpdateComplaintStatusForm', () => {
    beforeEach(() => {
        mockMutate.mockClear();
    });

    it('pre-populates the select with the current status', () => {
        renderWithProviders(
            <UpdateComplaintStatusForm
                complaintId="c-1"
                hostelId="hostel-1"
                currentStatus="IN_PROGRESS"
            />
        );
        expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
    });

    it('submits the currently selected status unchanged when nothing is touched', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <UpdateComplaintStatusForm
                complaintId="c-1"
                hostelId="hostel-1"
                currentStatus="OPEN"
            />
        );

        await user.click(screen.getByRole('button', { name: /update/i }));

        await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
        const [payload] = mockMutate.mock.calls[0];
        expect(payload).toEqual({ status: 'OPEN' });
    });

    it('submits the newly selected status after choosing a different option', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <UpdateComplaintStatusForm
                complaintId="c-1"
                hostelId="hostel-1"
                currentStatus="OPEN"
            />
        );

        await user.click(screen.getByRole('combobox'));
        await user.click(
            await screen.findByRole('option', { name: 'Resolved' })
        );
        await user.click(screen.getByRole('button', { name: /update/i }));

        await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
        expect(mockMutate.mock.calls[0][0]).toEqual({ status: 'RESOLVED' });
    });

    it('calls onSuccess after a successful update', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();
        mockMutate.mockImplementation((_payload, { onSuccess: cb }) => cb());

        renderWithProviders(
            <UpdateComplaintStatusForm
                complaintId="c-1"
                hostelId="hostel-1"
                currentStatus="OPEN"
                onSuccess={onSuccess}
            />
        );

        await user.click(screen.getByRole('button', { name: /update/i }));
        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    });

    it('maps a VALIDATION_FAILED server error back onto the status field', async () => {
        const user = userEvent.setup();
        mockMutate.mockImplementation((_payload, { onError }) => {
            onError({
                code: 'VALIDATION_FAILED',
                message: 'Validation failed',
                details: { status: ['Cannot reopen a closed complaint'] },
            });
        });

        renderWithProviders(
            <UpdateComplaintStatusForm
                complaintId="c-1"
                hostelId="hostel-1"
                currentStatus="CLOSED"
            />
        );

        await user.click(screen.getByRole('button', { name: /update/i }));

        expect(
            await screen.findByText('Cannot reopen a closed complaint')
        ).toBeInTheDocument();
    });

    it('falls back to a generic message when the server error has no details', async () => {
        const user = userEvent.setup();
        mockMutate.mockImplementation((_payload, { onError }) => {
            onError({
                code: 'VALIDATION_FAILED',
                message: 'Validation failed',
                details: {},
            });
        });

        renderWithProviders(
            <UpdateComplaintStatusForm
                complaintId="c-1"
                hostelId="hostel-1"
                currentStatus="OPEN"
            />
        );

        await user.click(screen.getByRole('button', { name: /update/i }));

        expect(await screen.findByText('Invalid status')).toBeInTheDocument();
    });
});
