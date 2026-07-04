import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaitlistPositionBadge } from './WaitlistPositionBadge';

describe('WaitlistPositionBadge', () => {
    it('renders the ordinal position label and "in queue" caption by default', () => {
        render(<WaitlistPositionBadge position={2} />);
        expect(screen.getByText('2nd')).toBeInTheDocument();
        expect(screen.getByText('in queue')).toBeInTheDocument();
    });

    it('renders a compact "#N" pill when compact is true', () => {
        render(<WaitlistPositionBadge position={5} compact />);
        expect(screen.getByText('#5')).toBeInTheDocument();
        expect(screen.queryByText('in queue')).not.toBeInTheDocument();
    });

    it('applies the amber "next up" palette for position 1', () => {
        render(<WaitlistPositionBadge position={1} />);
        expect(screen.getByText('1st').className).toContain('amber');
    });

    it('applies the blue "close" palette for positions 2-3', () => {
        render(<WaitlistPositionBadge position={3} />);
        expect(screen.getByText('3rd').className).toContain('blue');
    });

    it('applies the neutral gray palette for position 4+', () => {
        render(<WaitlistPositionBadge position={7} />);
        expect(screen.getByText('7th').className).toContain('gray');
    });
});
