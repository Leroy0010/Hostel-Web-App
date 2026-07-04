import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { CreateBookingForm } from './CreateBookingForm';
import type { AvailablePeriodDto } from '@/features/hostel/types/hostel.types';

// -----------------------------------------------------------------------
// The real Combobox is a Radix/portal-based primitive that is expensive to
// drive reliably in jsdom. CreateBookingForm's own responsibility is
// "wire the selected period into academicYear/semester", so we swap in a
// trivial native <select> that preserves the same onValueChange contract —
// isolating the unit under test from an unrelated component.
// -----------------------------------------------------------------------
vi.mock('@/components/ui/my-combobox', () => ({
    Combobox: ({
        options,
        onValueChange,
        placeholder,
    }: {
        options: { value: string; label: string }[];
        onValueChange: (value: string) => void;
        placeholder: string;
    }) => (
        <select
            aria-label={placeholder}
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

vi.mock('../hooks/booking.hooks', () => ({
    useCreateBooking: () => ({ mutate: mockMutate, isPending: false }),
}));

const ROOM_ID = '11111111-1111-4111-8111-111111111111';

const availablePeriods: AvailablePeriodDto[] = [
    { academicYear: '2025/2026', semester: 'FIRST' },
    { academicYear: '2025/2026', semester: 'SECOND' },
];

describe('CreateBookingForm', () => {
    beforeEach(() => {
        mockMutate.mockClear();
    });

    it('renders the period selector populated from availablePeriods', () => {
        renderWithProviders(
            <CreateBookingForm
                roomId={ROOM_ID}
                availablePeriods={availablePeriods}
            />
        );
        const select = screen.getByLabelText(
            'Select period'
        ) as HTMLSelectElement;
        expect(select).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: '2025/2026 | FIRST' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: '2025/2026 | SECOND' })
        ).toBeInTheDocument();
    });

    it('blocks submission and surfaces an error when no period is selected', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <CreateBookingForm
                roomId={ROOM_ID}
                availablePeriods={availablePeriods}
            />
        );

        await user.click(
            screen.getByRole('button', { name: /submit booking request/i })
        );

        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it('submits roomId plus the parsed academicYear/semester from the chosen period', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <CreateBookingForm
                roomId={ROOM_ID}
                availablePeriods={availablePeriods}
            />
        );

        await user.selectOptions(
            screen.getByLabelText('Select period'),
            '2025/2026|SECOND'
        );
        await user.click(
            screen.getByRole('button', { name: /submit booking request/i })
        );

        await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
        const [payload] = mockMutate.mock.calls[0];
        expect(payload).toEqual({
            roomId: ROOM_ID,
            academicYear: '2025/2026',
            semester: 'SECOND',
        });
    });

    it('calls onSuccess with the new booking id after a successful submit', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();
        mockMutate.mockImplementation((_payload, { onSuccess: cb }) => {
            cb({ id: 'booking-99' });
        });

        renderWithProviders(
            <CreateBookingForm
                roomId={ROOM_ID}
                availablePeriods={availablePeriods}
                onSuccess={onSuccess}
            />
        );

        await user.selectOptions(
            screen.getByLabelText('Select period'),
            '2025/2026|FIRST'
        );
        await user.click(
            screen.getByRole('button', { name: /submit booking request/i })
        );

        await waitFor(() =>
            expect(onSuccess).toHaveBeenCalledWith('booking-99')
        );
    });

    it('renders and wires the Cancel button only when onCancel is provided', async () => {
        const onCancel = vi.fn();
        const { rerender } = renderWithProviders(
            <CreateBookingForm
                roomId={ROOM_ID}
                availablePeriods={availablePeriods}
            />
        );
        expect(
            screen.queryByRole('button', { name: /cancel/i })
        ).not.toBeInTheDocument();

        rerender(
            <CreateBookingForm
                roomId={ROOM_ID}
                availablePeriods={availablePeriods}
                onCancel={onCancel}
            />
        );
        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalled();
    });

    it('maps a VALIDATION_FAILED server error back onto the matching field', async () => {
        const user = userEvent.setup();
        mockMutate.mockImplementation((_payload, { onError }) => {
            onError({
                code: 'VALIDATION_FAILED',
                message: 'Validation failed',
                // NOTE: CreateBookingForm only renders a <FieldError> for
                // `selectedPeriodKey` (the virtual combobox field) — not for
                // `academicYear`/`semester`, which are set programmatically
                // via setValue() and have no FieldError block of their own.
                // A server error keyed by "selectedPeriodKey" is therefore
                // the only server-mapped error this form can actually show.
                details: {
                    selectedPeriodKey: ['Room is no longer available'],
                },
            });
        });

        renderWithProviders(
            <CreateBookingForm
                roomId={ROOM_ID}
                availablePeriods={availablePeriods}
            />
        );

        await user.selectOptions(
            screen.getByLabelText('Select period'),
            '2025/2026|FIRST'
        );
        await user.click(
            screen.getByRole('button', { name: /submit booking request/i })
        );

        expect(
            await screen.findByText('Room is no longer available')
        ).toBeInTheDocument();
    });
});
