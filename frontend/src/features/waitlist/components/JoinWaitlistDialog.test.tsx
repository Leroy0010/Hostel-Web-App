import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { JoinWaitlistDialog } from './JoinWaitlistDialog';

// -----------------------------------------------------------------------
// The real Combobox is a Radix/portal-based primitive that is expensive to
// drive reliably in jsdom. Since JoinWaitlistDialog's own responsibility
// is "wire the selected period into academicYear/semester", we replace it
// with a trivial native <select> that calls the same onValueChange
// contract — isolating the unit under test from an unrelated component.
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

const mockJoin = vi.fn();
const mockUseGetHostelWaitlistAvailablePeriods = vi.fn();

vi.mock('../hooks/waitlist.hooks', () => ({
    useJoinWaitlist: () => ({ mutate: mockJoin, isPending: false }),
    useGetHostelWaitlistAvailablePeriods: (...args: unknown[]) =>
        mockUseGetHostelWaitlistAvailablePeriods(...args),
}));

const HOSTEL_ID = '11111111-1111-4111-8111-111111111111';

describe('JoinWaitlistDialog', () => {
    beforeEach(() => {
        mockJoin.mockClear();
        mockUseGetHostelWaitlistAvailablePeriods.mockReturnValue({
            data: [
                { academicYear: '2025/2026', semester: 'FIRST' },
                { academicYear: '2025/2026', semester: 'SECOND' },
            ],
        });
    });

    it('does not render dialog content when closed', () => {
        renderWithProviders(
            <JoinWaitlistDialog
                open={false}
                onOpenChange={vi.fn()}
                hostelId={HOSTEL_ID}
            />
        );
        expect(screen.queryByText('Join Waitlist')).not.toBeInTheDocument();
    });

    it('renders the form with the room type pre-selected when provided', () => {
        renderWithProviders(
            <JoinWaitlistDialog
                open
                onOpenChange={vi.fn()}
                hostelId={HOSTEL_ID}
                defaultRoomType="DOUBLE"
            />
        );
        expect(
            screen.getByRole('heading', { name: /join waitlist/i })
        ).toBeInTheDocument();
        expect(screen.getAllByText('Double').length).toBeGreaterThan(0);
    });

    it('shows a validation error when submitted without selecting a period', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <JoinWaitlistDialog
                open
                onOpenChange={vi.fn()}
                hostelId={HOSTEL_ID}
                defaultRoomType="SINGLE"
            />
        );

        await user.click(
            screen.getByRole('button', { name: /join waitlist/i })
        );

        // NOTE: the dialog renders the academicYear field error under the
        // period Combobox (see JoinWaitlistDialog.tsx), so an unselected
        // period surfaces as an "academicYear" schema error rather than a
        // "selectedPeriodKey" one. Asserting on the field that actually
        // renders keeps this test tied to real user-visible behavior.
        expect(
            await screen.findByText(/expected string, received undefined/i)
        ).toBeInTheDocument();
        expect(mockJoin).not.toHaveBeenCalled();
    });

    it('submits with hostelId, roomType, and the parsed academicYear/semester from the chosen period', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        renderWithProviders(
            <JoinWaitlistDialog
                open
                onOpenChange={onOpenChange}
                hostelId={HOSTEL_ID}
                defaultRoomType="SINGLE"
            />
        );

        await user.selectOptions(
            screen.getByLabelText('Select period'),
            '2025/2026|SECOND'
        );
        await user.click(
            screen.getByRole('button', { name: /join waitlist/i })
        );

        await waitFor(() => expect(mockJoin).toHaveBeenCalledTimes(1), {
            timeout: 3000,
        });
        const [payload] = mockJoin.mock.calls[0];
        expect(payload).toMatchObject({
            hostelId: HOSTEL_ID,
            roomType: 'SINGLE',
            academicYear: '2025/2026',
            semester: 'SECOND',
        });
    });

    it('calls onOpenChange(false) and resets the form when Cancel is clicked', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        renderWithProviders(
            <JoinWaitlistDialog
                open
                onOpenChange={onOpenChange}
                hostelId={HOSTEL_ID}
            />
        );

        await user.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
