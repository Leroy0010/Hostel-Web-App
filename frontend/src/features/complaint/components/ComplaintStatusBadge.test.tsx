import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';

describe('ComplaintStatusBadge', () => {
    it('renders the human-readable label for the given status', () => {
        render(<ComplaintStatusBadge status="IN_PROGRESS" />);
        expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('shows a pulsing indicator for active statuses (OPEN, IN_PROGRESS)', () => {
        const { container: openContainer } = render(
            <ComplaintStatusBadge status="OPEN" />
        );
        expect(
            openContainer.querySelector('.animate-ping')
        ).toBeInTheDocument();

        const { container: progressContainer } = render(
            <ComplaintStatusBadge status="IN_PROGRESS" />
        );
        expect(
            progressContainer.querySelector('.animate-ping')
        ).toBeInTheDocument();
    });

    it('does not show a pulsing indicator for terminal statuses (RESOLVED, CLOSED)', () => {
        const { container: resolvedContainer } = render(
            <ComplaintStatusBadge status="RESOLVED" />
        );
        expect(
            resolvedContainer.querySelector('.animate-ping')
        ).not.toBeInTheDocument();

        const { container: closedContainer } = render(
            <ComplaintStatusBadge status="CLOSED" />
        );
        expect(
            closedContainer.querySelector('.animate-ping')
        ).not.toBeInTheDocument();
    });

    it('merges a custom className onto the badge', () => {
        render(<ComplaintStatusBadge status="OPEN" className="my-marker" />);
        expect(screen.getByText('Open').closest('span')).toHaveClass(
            'my-marker'
        );
    });
});
