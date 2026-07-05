import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComplaintCategoryBadge } from './ComplaintCategoryBadge';

describe('ComplaintCategoryBadge', () => {
    it('renders the icon and label by default', () => {
        render(<ComplaintCategoryBadge category="MAINTENANCE" />);
        expect(screen.getByText('Maintenance')).toBeInTheDocument();
    });

    it('hides the label and sets a title attribute in iconOnly mode', () => {
        render(<ComplaintCategoryBadge category="SECURITY" iconOnly />);
        expect(screen.queryByText('Security')).not.toBeInTheDocument();
        // The icon-only badge is the outer <span>; find it via its title.
        expect(screen.getByTitle('Security')).toBeInTheDocument();
    });

    it('does not set a title attribute when showing the full label', () => {
        render(<ComplaintCategoryBadge category="NOISE" />);
        expect(screen.getByText('Noise').closest('span')).not.toHaveAttribute(
            'title'
        );
    });

    it('renders a distinct icon per category', () => {
        const { container: maintenance } = render(
            <ComplaintCategoryBadge category="MAINTENANCE" iconOnly />
        );
        const { container: billing } = render(
            <ComplaintCategoryBadge category="BILLING" iconOnly />
        );
        expect(maintenance.textContent).not.toBe(billing.textContent);
    });
});
