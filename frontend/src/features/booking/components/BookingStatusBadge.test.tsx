import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookingStatusBadge } from './BookingStatusBadge';

describe('BookingStatusBadge', () => {
    it('renders the human-readable label for the given status', () => {
        render(<BookingStatusBadge status="CHECKED_IN" />);
        expect(screen.getByText('Checked In')).toBeInTheDocument();
    });

    it('shows a pulsing indicator for active statuses', () => {
        const { container } = render(<BookingStatusBadge status="PENDING" />);
        expect(container.querySelector('.animate-ping')).toBeInTheDocument();
    });

    it('does not show a pulsing indicator for terminal statuses', () => {
        const { container } = render(<BookingStatusBadge status="CANCELLED" />);
        expect(
            container.querySelector('.animate-ping')
        ).not.toBeInTheDocument();
    });

    it('merges a custom className onto the badge', () => {
        render(<BookingStatusBadge status="APPROVED" className="my-marker" />);
        expect(screen.getByText('Approved').closest('span')).toHaveClass(
            'my-marker'
        );
    });
});
