import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PaymentCountdown } from './PaymentCountdown';

describe('PaymentCountdown', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows the expired state immediately when the deadline has passed', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-01T12:00:00.000Z'));
        render(<PaymentCountdown deadlineIso="2025-06-01T11:00:00.000Z" />);
        expect(screen.getByText('Payment window expired')).toBeInTheDocument();
    });

    it('shows a normal (non-urgent) countdown when more than an hour remains', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
        render(<PaymentCountdown deadlineIso="2025-06-01T05:00:00.000Z" />);
        expect(screen.getByText('5h 0m')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveAttribute(
            'aria-label',
            'Payment deadline: 5h 0m remaining'
        );
    });

    it('ticks down every second and updates the displayed time', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
        render(<PaymentCountdown deadlineIso="2025-06-01T00:00:10.000Z" />);
        expect(screen.getByText('0m 10s')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(3000);
        });
        expect(screen.getByText('0m 7s')).toBeInTheDocument();
    });

    it('transitions to the expired state once the countdown reaches zero', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
        render(<PaymentCountdown deadlineIso="2025-06-01T00:00:02.000Z" />);
        expect(screen.getByText('0m 2s')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(3000);
        });
        expect(screen.getByText('Payment window expired')).toBeInTheDocument();
    });

    it('clears its interval on unmount (no state updates after unmount)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
        const { unmount } = render(
            <PaymentCountdown deadlineIso="2025-06-01T01:00:00.000Z" />
        );
        const clearSpy = vi.spyOn(window, 'clearInterval');
        unmount();
        expect(clearSpy).toHaveBeenCalled();
    });
});
