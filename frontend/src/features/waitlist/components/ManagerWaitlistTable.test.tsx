import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { ManagerWaitlistTable } from './ManagerWaitlistTable';
import type { WaitlistEntryDto } from '../types/waitlist.types';
import type { PageResponse } from '@/types/pagination';

const mockUseManagerWaitlist = vi.fn();
const mockRemoveEntry = vi.fn();

vi.mock('../hooks/waitlist.hooks', () => ({
    useManagerWaitlist: (...args: unknown[]) => mockUseManagerWaitlist(...args),
    useManagerRemoveWaitlistEntry: () => ({
        mutate: mockRemoveEntry,
        isPending: false,
    }),
}));

const HOSTEL_ID = 'hostel-1';

const makeEntry = (
    overrides: Partial<WaitlistEntryDto> = {}
): WaitlistEntryDto => ({
    id: 'wl-1',
    position: 1,
    studentId: 'student-1',
    studentFirstName: 'Ama',
    studentLastName: 'Owusu',
    studentEmail: 'ama.owusu@ucc.edu.gh',
    roomType: 'SINGLE',
    academicYear: '2025/2026',
    semester: 'FIRST',
    joinedAt: '2025-06-01T10:00:00.000Z',
    notified: false,
    ...overrides,
});

function makePage(
    content: WaitlistEntryDto[],
    overrides: Partial<PageResponse<WaitlistEntryDto>> = {}
): PageResponse<WaitlistEntryDto> {
    return {
        content,
        pageable: {
            pageNumber: 0,
            pageSize: 20,
            sort: { sorted: false, unsorted: true, empty: true },
        },
        totalElements: content.length,
        totalPages: 1,
        last: true,
        first: true,
        numberOfElements: content.length,
        size: 20,
        number: 0,
        empty: content.length === 0,
        ...overrides,
    };
}

describe('ManagerWaitlistTable', () => {
    beforeEach(() => {
        mockUseManagerWaitlist.mockReset();
        mockRemoveEntry.mockReset();
    });

    it('renders a skeleton while loading', () => {
        mockUseManagerWaitlist.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
            isFetching: true,
        });
        const { container } = renderWithProviders(
            <ManagerWaitlistTable hostelId={HOSTEL_ID} />
        );
        expect(
            container.querySelector('[aria-hidden="true"]')
        ).toBeInTheDocument();
    });

    it('renders an error empty-state when the query fails', () => {
        mockUseManagerWaitlist.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            isFetching: false,
        });
        renderWithProviders(<ManagerWaitlistTable hostelId={HOSTEL_ID} />);
        expect(screen.getByText('Could not load waitlist')).toBeInTheDocument();
    });

    it('renders an empty-state when there are no entries', () => {
        mockUseManagerWaitlist.mockReturnValue({
            data: makePage([]),
            isLoading: false,
            isError: false,
            isFetching: false,
        });
        renderWithProviders(<ManagerWaitlistTable hostelId={HOSTEL_ID} />);
        expect(screen.getByText('No waitlist entries')).toBeInTheDocument();
    });

    it('renders a row per entry with student name, room type, and period', () => {
        mockUseManagerWaitlist.mockReturnValue({
            data: makePage([
                makeEntry(),
                makeEntry({
                    id: 'wl-2',
                    position: 2,
                    studentFirstName: 'Kwame',
                    studentLastName: 'Mensah',
                    studentEmail: 'kwame.mensah@ucc.edu.gh',
                    roomType: 'DOUBLE',
                }),
            ]),
            isLoading: false,
            isError: false,
            isFetching: false,
        });
        renderWithProviders(<ManagerWaitlistTable hostelId={HOSTEL_ID} />);

        expect(screen.getByText('Ama Owusu')).toBeInTheDocument();
        expect(screen.getByText('Kwame Mensah')).toBeInTheDocument();
        expect(screen.getByText('Single')).toBeInTheDocument();
        expect(screen.getByText('Double')).toBeInTheDocument();
        expect(screen.getByText('2 entries')).toBeInTheDocument();
    });

    it('shows a "Notified" indicator only for notified entries', () => {
        mockUseManagerWaitlist.mockReturnValue({
            data: makePage([makeEntry({ notified: true })]),
            isLoading: false,
            isError: false,
            isFetching: false,
        });
        renderWithProviders(<ManagerWaitlistTable hostelId={HOSTEL_ID} />);
        expect(screen.getByText('Notified')).toBeInTheDocument();
        expect(screen.queryByText('Waiting')).not.toBeInTheDocument();
    });

    it('requests page 0 with the room type filter applied when changed', async () => {
        const user = userEvent.setup();
        mockUseManagerWaitlist.mockReturnValue({
            data: makePage([makeEntry()], {
                totalPages: 3,
                totalElements: 50,
            }),
            isLoading: false,
            isError: false,
            isFetching: false,
        });
        renderWithProviders(<ManagerWaitlistTable hostelId={HOSTEL_ID} />);

        // Open the room type filter (first select trigger) and pick "Double".
        const triggers = screen.getAllByRole('combobox');
        await user.click(triggers[0]);
        await user.click(await screen.findByRole('option', { name: 'Double' }));

        await waitFor(() => {
            const [, lastParams] =
                mockUseManagerWaitlist.mock.calls[
                    mockUseManagerWaitlist.mock.calls.length - 1
                ];
            expect(lastParams).toMatchObject({
                roomType: 'DOUBLE',
                page: 0,
            });
        });
    });

    it('opens a confirmation dialog and calls the remove mutation on confirm', async () => {
        const user = userEvent.setup();
        mockUseManagerWaitlist.mockReturnValue({
            data: makePage([makeEntry()]),
            isLoading: false,
            isError: false,
            isFetching: false,
        });
        renderWithProviders(<ManagerWaitlistTable hostelId={HOSTEL_ID} />);

        await user.click(
            screen.getByRole('button', {
                name: /remove ama owusu from waitlist/i,
            })
        );

        const dialog = await screen.findByRole('alertdialog');
        expect(
            within(dialog).getByText('Remove from waitlist?')
        ).toBeInTheDocument();

        await user.click(
            within(dialog).getByRole('button', { name: /^remove$/i })
        );

        expect(mockRemoveEntry).toHaveBeenCalledWith(
            'wl-1',
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it('does not call the remove mutation until the dialog is confirmed', async () => {
        const user = userEvent.setup();
        mockUseManagerWaitlist.mockReturnValue({
            data: makePage([makeEntry()]),
            isLoading: false,
            isError: false,
            isFetching: false,
        });
        renderWithProviders(<ManagerWaitlistTable hostelId={HOSTEL_ID} />);

        await user.click(
            screen.getByRole('button', {
                name: /remove ama owusu from waitlist/i,
            })
        );
        await screen.findByRole('alertdialog');

        expect(mockRemoveEntry).not.toHaveBeenCalled();
    });
});
