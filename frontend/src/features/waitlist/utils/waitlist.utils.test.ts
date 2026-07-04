import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    roomTypeLabel,
    semesterLabel,
    positionLabel,
    joinedAtLabel,
    positionBadgeColors,
    academicYearOptions,
} from './waitlist.utils';

describe('roomTypeLabel', () => {
    it('maps every known room type to its label', () => {
        expect(roomTypeLabel('SINGLE')).toBe('Single');
        expect(roomTypeLabel('DOUBLE')).toBe('Double');
        expect(roomTypeLabel('TRIPLE')).toBe('Triple');
        expect(roomTypeLabel('QUAD')).toBe('Quad');
    });
});

describe('semesterLabel', () => {
    it('maps every known semester value', () => {
        expect(semesterLabel('FIRST')).toBe('First Semester');
        expect(semesterLabel('SECOND')).toBe('Second Semester');
        expect(semesterLabel('FULL')).toBe('Full Year');
    });

    it('falls back to the raw value for unknown input', () => {
        expect(semesterLabel('SUMMER')).toBe('SUMMER');
    });
});

describe('positionLabel', () => {
    it('formats standard ordinal suffixes correctly', () => {
        expect(positionLabel(1)).toBe('1st');
        expect(positionLabel(2)).toBe('2nd');
        expect(positionLabel(3)).toBe('3rd');
        expect(positionLabel(4)).toBe('4th');
    });

    it('handles the 11th-13th special-case (always "th")', () => {
        expect(positionLabel(11)).toBe('11th');
        expect(positionLabel(12)).toBe('12th');
        expect(positionLabel(13)).toBe('13th');
    });

    it('handles larger numbers whose last digit determines the suffix', () => {
        expect(positionLabel(21)).toBe('21st');
        expect(positionLabel(22)).toBe('22nd');
        expect(positionLabel(23)).toBe('23rd');
        expect(positionLabel(101)).toBe('101st');
        expect(positionLabel(111)).toBe('111th');
    });
});

describe('joinedAtLabel', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders "Today" for a timestamp from earlier today', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T18:00:00.000Z'));
        expect(joinedAtLabel('2025-06-15T08:00:00.000Z')).toBe('Today');
    });

    it('renders "Yesterday" for a timestamp exactly one day ago', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
        expect(joinedAtLabel('2025-06-14T12:00:00.000Z')).toBe('Yesterday');
    });

    it('renders a relative "X days ago" label for recent dates under 30 days', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
        expect(joinedAtLabel('2025-06-10T12:00:00.000Z')).toBe('5 days ago');
    });

    it('renders an absolute date for anything 30+ days old', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
        const label = joinedAtLabel('2025-01-01T12:00:00.000Z');
        expect(label).toContain('2025');
        expect(label).toMatch(/Jan/);
    });
});

describe('positionBadgeColors', () => {
    it('gives position 1 the amber "next up" treatment', () => {
        const colors = positionBadgeColors(1);
        expect(colors.bg).toContain('amber');
    });

    it('gives positions 2 and 3 the blue "close" treatment', () => {
        expect(positionBadgeColors(2).bg).toContain('blue');
        expect(positionBadgeColors(3).bg).toContain('blue');
    });

    it('gives position 4+ the neutral gray treatment', () => {
        expect(positionBadgeColors(4).bg).toContain('gray');
        expect(positionBadgeColors(50).bg).toContain('gray');
    });
});

describe('academicYearOptions', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns last, current, and next academic years', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T00:00:00.000Z'));
        expect(academicYearOptions()).toEqual([
            '2024/2025',
            '2025/2026',
            '2026/2027',
        ]);
    });
});
