import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    statusLabel,
    statusColors,
    isTerminalStatus,
    isStudentCancellable,
    isAwaitingPayment,
    semesterLabel,
    formatDateTime,
    formatDate,
    timeRemaining,
    isPastDeadline,
    currentAcademicYear,
    academicYearOptions,
} from './booking.utils';
import type { BookingStatus } from '../types/booking.types';

const ALL_STATUSES: BookingStatus[] = [
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CHECKED_IN',
    'CHECKED_OUT',
    'CANCELLED',
    'EXPIRED',
    'WAITLISTED',
];

describe('statusLabel', () => {
    it('returns the correct human-readable label for every status', () => {
        expect(statusLabel('PENDING')).toBe('Pending');
        expect(statusLabel('APPROVED')).toBe('Approved');
        expect(statusLabel('REJECTED')).toBe('Rejected');
        expect(statusLabel('CHECKED_IN')).toBe('Checked In');
        expect(statusLabel('CHECKED_OUT')).toBe('Checked Out');
        expect(statusLabel('CANCELLED')).toBe('Cancelled');
        expect(statusLabel('EXPIRED')).toBe('Expired');
        expect(statusLabel('WAITLISTED')).toBe('Waitlisted');
    });

    it('falls back to the raw status string for an unknown value', () => {
        expect(statusLabel('SOMETHING_NEW' as BookingStatus)).toBe(
            'SOMETHING_NEW'
        );
    });
});

describe('statusColors', () => {
    it('returns a complete color token set for every known status', () => {
        for (const status of ALL_STATUSES) {
            const colors = statusColors(status);
            expect(colors).toMatchObject({
                bg: expect.any(String),
                text: expect.any(String),
                border: expect.any(String),
                dot: expect.any(String),
            });
        }
    });

    it('groups all terminal-failure statuses under the same red palette', () => {
        const rejected = statusColors('REJECTED');
        const cancelled = statusColors('CANCELLED');
        const expired = statusColors('EXPIRED');
        expect(rejected).toEqual(cancelled);
        expect(cancelled).toEqual(expired);
    });
});

describe('isTerminalStatus', () => {
    it('treats REJECTED, CANCELLED, EXPIRED and CHECKED_OUT as terminal', () => {
        expect(isTerminalStatus('REJECTED')).toBe(true);
        expect(isTerminalStatus('CANCELLED')).toBe(true);
        expect(isTerminalStatus('EXPIRED')).toBe(true);
        expect(isTerminalStatus('CHECKED_OUT')).toBe(true);
    });

    it('treats active statuses as non-terminal', () => {
        expect(isTerminalStatus('PENDING')).toBe(false);
        expect(isTerminalStatus('APPROVED')).toBe(false);
        expect(isTerminalStatus('CHECKED_IN')).toBe(false);
        expect(isTerminalStatus('WAITLISTED')).toBe(false);
    });
});

describe('isStudentCancellable', () => {
    it('allows cancellation only while PENDING or APPROVED', () => {
        expect(isStudentCancellable('PENDING')).toBe(true);
        expect(isStudentCancellable('APPROVED')).toBe(true);
    });

    it('disallows cancellation for every other status', () => {
        for (const status of ALL_STATUSES.filter(
            (s) => s !== 'PENDING' && s !== 'APPROVED'
        )) {
            expect(isStudentCancellable(status)).toBe(false);
        }
    });
});

describe('isAwaitingPayment', () => {
    it('is true only for APPROVED bookings', () => {
        expect(isAwaitingPayment('APPROVED')).toBe(true);
        for (const status of ALL_STATUSES.filter((s) => s !== 'APPROVED')) {
            expect(isAwaitingPayment(status)).toBe(false);
        }
    });
});

describe('semesterLabel', () => {
    it('maps every semester enum value to its label', () => {
        expect(semesterLabel('FIRST')).toBe('1st Semester');
        expect(semesterLabel('SECOND')).toBe('2nd Semester');
        expect(semesterLabel('FULL')).toBe('Full Year');
    });
});

describe('formatDateTime / formatDate', () => {
    it('renders an em-dash for null or undefined input', () => {
        expect(formatDateTime(null)).toBe('—');
        expect(formatDateTime(undefined)).toBe('—');
        expect(formatDate(null)).toBe('—');
        expect(formatDate(undefined)).toBe('—');
    });

    it('formats a valid ISO string into a localized date', () => {
        const result = formatDate('2025-01-12T14:30:00.000Z');
        // Exact rendering is locale/timezone dependent in CI, so assert on
        // the stable substrings rather than the full formatted string.
        expect(result).toContain('2025');
        expect(result).toMatch(/Jan/);
    });

    it('formats a valid ISO string into a localized date + time', () => {
        const result = formatDateTime('2025-01-12T14:30:00.000Z');
        expect(result).toContain('2025');
        expect(result).toMatch(/Jan/);
    });
});

describe('timeRemaining', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders an em-dash when no deadline is provided', () => {
        expect(timeRemaining(null)).toBe('—');
        expect(timeRemaining(undefined)).toBe('—');
    });

    it('renders "Expired" once the deadline has passed', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));
        expect(timeRemaining('2025-01-01T11:00:00.000Z')).toBe('Expired');
    });

    it('renders days/hours/minutes when more than an hour remains', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
        // 1 day, 2 hours, 30 minutes away.
        const deadline = new Date(Date.UTC(2025, 0, 2, 2, 30, 0)).toISOString();
        expect(timeRemaining(deadline)).toBe('1d 2h 30m');
    });

    it('renders hours/minutes when under a day but over an hour remains', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
        const deadline = new Date(Date.UTC(2025, 0, 1, 3, 15, 0)).toISOString();
        expect(timeRemaining(deadline)).toBe('3h 15m');
    });

    it('renders minutes/seconds when under an hour remains', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
        const deadline = new Date(Date.UTC(2025, 0, 1, 0, 5, 30)).toISOString();
        expect(timeRemaining(deadline)).toBe('5m 30s');
    });
});

describe('isPastDeadline', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns false when no deadline is given', () => {
        expect(isPastDeadline(null)).toBe(false);
        expect(isPastDeadline(undefined)).toBe(false);
    });

    it('returns true once "now" is after the deadline', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
        expect(isPastDeadline('2025-05-31T23:59:59.000Z')).toBe(true);
    });

    it('returns false while "now" is before the deadline', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
        expect(isPastDeadline('2025-06-02T00:00:00.000Z')).toBe(false);
    });
});

describe('currentAcademicYear', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('rolls into the new academic year starting in September', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2025, 8, 15)); // Sep 15 2025 (month index 8)
        expect(currentAcademicYear()).toBe('2025/2026');
    });

    it('stays in the prior academic year before September', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2025, 2, 10)); // March 10 2025
        expect(currentAcademicYear()).toBe('2024/2025');
    });

    it('is exactly on the September boundary (month index 8, day 1)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2025, 8, 1));
        expect(currentAcademicYear()).toBe('2025/2026');
    });
});

describe('academicYearOptions', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns the current and next academic year, in order', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2025, 8, 15));
        expect(academicYearOptions()).toEqual(['2025/2026', '2026/2027']);
    });
});
