import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    complaintStatusLabel,
    complaintStatusColors,
    isTerminalComplaintStatus,
    complaintCategoryLabel,
    complaintCategoryColors,
    complaintDateLabel,
    netScoreColorClass,
} from './complaint.utils';
import type {
    ComplaintCategory,
    ComplaintStatus,
} from '../types/complaint.types';

const ALL_STATUSES: ComplaintStatus[] = [
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED',
];
const ALL_CATEGORIES: ComplaintCategory[] = [
    'MAINTENANCE',
    'CLEANLINESS',
    'SECURITY',
    'NOISE',
    'BILLING',
    'OTHER',
];

describe('complaintStatusLabel', () => {
    it('maps every status to its human-readable label', () => {
        expect(complaintStatusLabel('OPEN')).toBe('Open');
        expect(complaintStatusLabel('IN_PROGRESS')).toBe('In Progress');
        expect(complaintStatusLabel('RESOLVED')).toBe('Resolved');
        expect(complaintStatusLabel('CLOSED')).toBe('Closed');
    });
});

describe('complaintStatusColors', () => {
    it('returns a complete color token set for every status', () => {
        for (const status of ALL_STATUSES) {
            const colors = complaintStatusColors(status);
            expect(colors).toMatchObject({
                bg: expect.any(String),
                text: expect.any(String),
                border: expect.any(String),
                dot: expect.any(String),
            });
        }
    });

    it('assigns a unique dot color per status', () => {
        const dots = ALL_STATUSES.map((s) => complaintStatusColors(s).dot);
        expect(new Set(dots).size).toBe(ALL_STATUSES.length);
    });
});

describe('isTerminalComplaintStatus', () => {
    it('is true only for CLOSED', () => {
        expect(isTerminalComplaintStatus('CLOSED')).toBe(true);
        expect(isTerminalComplaintStatus('OPEN')).toBe(false);
        expect(isTerminalComplaintStatus('IN_PROGRESS')).toBe(false);
        expect(isTerminalComplaintStatus('RESOLVED')).toBe(false);
    });
});

describe('complaintCategoryLabel', () => {
    it('maps every category to its human-readable label', () => {
        expect(complaintCategoryLabel('MAINTENANCE')).toBe('Maintenance');
        expect(complaintCategoryLabel('CLEANLINESS')).toBe('Cleanliness');
        expect(complaintCategoryLabel('SECURITY')).toBe('Security');
        expect(complaintCategoryLabel('NOISE')).toBe('Noise');
        expect(complaintCategoryLabel('BILLING')).toBe('Billing');
        expect(complaintCategoryLabel('OTHER')).toBe('Other');
    });
});

describe('complaintCategoryColors', () => {
    it('returns a complete color token set for every category', () => {
        for (const category of ALL_CATEGORIES) {
            const colors = complaintCategoryColors(category);
            expect(colors).toMatchObject({
                bg: expect.any(String),
                text: expect.any(String),
                border: expect.any(String),
            });
        }
    });
});

describe('complaintDateLabel', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders "Today" for a timestamp from earlier today', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T18:00:00.000Z'));
        expect(complaintDateLabel('2025-06-15T08:00:00.000Z')).toBe('Today');
    });

    it('renders "Yesterday" for a timestamp exactly one day ago', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
        expect(complaintDateLabel('2025-06-14T12:00:00.000Z')).toBe(
            'Yesterday'
        );
    });

    it('renders a relative "X days ago" label for recent dates under 30 days', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
        expect(complaintDateLabel('2025-06-10T12:00:00.000Z')).toBe(
            '5 days ago'
        );
    });

    it('renders an absolute date for anything 30+ days old', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
        const label = complaintDateLabel('2025-01-01T12:00:00.000Z');
        expect(label).toContain('2025');
        expect(label).toMatch(/Jan/);
    });
});

describe('netScoreColorClass', () => {
    it('returns the green palette for a positive score', () => {
        expect(netScoreColorClass(5)).toContain('green');
    });

    it('returns the red/negative palette for a negative score', () => {
        expect(netScoreColorClass(-3)).toContain('red');
    });

    it('returns the neutral gray palette for a zero score', () => {
        expect(netScoreColorClass(0)).toContain('gray');
    });
});
