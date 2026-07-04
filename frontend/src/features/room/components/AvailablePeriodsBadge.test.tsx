import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvailablePeriodsBadge } from './AvailablePeriodsBadge';
import type { AvailablePeriodDto } from '@/features/hostel/types/hostel.types';

const onePeriod: AvailablePeriodDto[] = [
    { academicYear: '2024/2025', semester: 'FIRST' },
];
const twoPeriods: AvailablePeriodDto[] = [
    { academicYear: '2024/2025', semester: 'FIRST' },
    { academicYear: '2024/2025', semester: 'SECOND' },
];

describe('AvailablePeriodsBadge — compact mode', () => {
    it('shows "Not available" when there are no periods', () => {
        render(<AvailablePeriodsBadge periods={[]} compact />);
        expect(screen.getByText('Not available')).toBeInTheDocument();
    });

    it('shows the single formatted period label (no count) for exactly one period', () => {
        render(<AvailablePeriodsBadge periods={onePeriod} compact />);
        expect(
            screen.getByText('2024/2025 · First Sem open')
        ).toBeInTheDocument();
    });

    it('shows a pluralized count for two or more periods', () => {
        render(<AvailablePeriodsBadge periods={twoPeriods} compact />);
        expect(screen.getByText('2 periods open')).toBeInTheDocument();
    });
});

describe('AvailablePeriodsBadge — full mode', () => {
    it('shows a "no periods" message when empty', () => {
        render(<AvailablePeriodsBadge periods={[]} />);
        expect(
            screen.getByText('No available booking periods')
        ).toBeInTheDocument();
    });

    it('renders one badge per period with the formatted label', () => {
        render(<AvailablePeriodsBadge periods={twoPeriods} />);
        expect(screen.getByText('Available periods')).toBeInTheDocument();
        expect(screen.getByText('2024/2025 · First Sem')).toBeInTheDocument();
        expect(screen.getByText('2024/2025 · Second Sem')).toBeInTheDocument();
    });

    it('title-cases an unrecognized semester value rather than crashing', () => {
        render(
            <AvailablePeriodsBadge
                periods={[{ academicYear: '2025/2026', semester: 'SUMMER' }]}
            />
        );
        expect(screen.getByText('2025/2026 · Summer')).toBeInTheDocument();
    });
});
