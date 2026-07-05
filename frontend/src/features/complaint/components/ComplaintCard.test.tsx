import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { ComplaintCard, ComplaintCardSkeleton } from './ComplaintCard';
import type { ComplaintSummaryDto } from '../types/complaint.types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual =
        await vi.importActual<typeof import('react-router-dom')>(
            'react-router-dom'
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

const baseComplaint: ComplaintSummaryDto = {
    id: 'complaint-1',
    authorName: 'Ama Owusu',
    hostelId: 'hostel-1',
    hostelName: 'Leroy Hostel',
    title: 'Broken window in room A12',
    status: 'OPEN',
    category: 'MAINTENANCE',
    netScore: 3,
    attachmentCount: 0,
    createdAt: '2025-06-01T10:00:00.000Z',
};

describe('ComplaintCard', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    it('renders the title, hostel name, status, and category', () => {
        renderWithProviders(<ComplaintCard complaint={baseComplaint} />);
        expect(
            screen.getByText('Broken window in room A12')
        ).toBeInTheDocument();
        expect(screen.getByText('Leroy Hostel')).toBeInTheDocument();
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('Maintenance')).toBeInTheDocument();
    });

    it('renders the net score with a leading + for positive values', () => {
        renderWithProviders(<ComplaintCard complaint={baseComplaint} />);
        expect(screen.getByText('+3')).toBeInTheDocument();
    });

    it('renders a negative net score without an extra sign', () => {
        renderWithProviders(
            <ComplaintCard complaint={{ ...baseComplaint, netScore: -2 }} />
        );
        expect(screen.getByText('-2')).toBeInTheDocument();
    });

    it('hides the attachment count when there are no attachments', () => {
        renderWithProviders(<ComplaintCard complaint={baseComplaint} />);
        expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('shows the attachment count when attachments exist', () => {
        renderWithProviders(
            <ComplaintCard
                complaint={{ ...baseComplaint, attachmentCount: 2 }}
            />
        );
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('navigates to the complaint detail page when clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(<ComplaintCard complaint={baseComplaint} />);

        await user.click(
            screen.getByRole('button', {
                name: /view complaint: broken window in room a12/i,
            })
        );

        expect(mockNavigate).toHaveBeenCalledWith('/complaints/complaint-1');
    });
});

describe('ComplaintCardSkeleton', () => {
    it('renders a loading placeholder marked aria-hidden', () => {
        const { container } = renderWithProviders(<ComplaintCardSkeleton />);
        expect(
            container.querySelector('[aria-hidden="true"]')
        ).toBeInTheDocument();
    });
});
