import { describe, it, expect } from 'vitest';
import {
    roomTypeLabel,
    roomTypeColors,
    roomStatusLabel,
    roomStatusColors,
    formatPrice,
    bedsLabel,
    roomImageFallback,
} from './room.utils';
import type { RoomStatus, RoomType } from '../types/room.types';

const ROOM_TYPES: RoomType[] = ['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD'];
const ROOM_STATUSES: RoomStatus[] = [
    'AVAILABLE',
    'FULLY_OCCUPIED',
    'UNDER_MAINTENANCE',
    'RESERVED',
];

describe('roomTypeLabel', () => {
    it('maps every room type to a human label', () => {
        expect(roomTypeLabel('SINGLE')).toBe('Single');
        expect(roomTypeLabel('DOUBLE')).toBe('Double');
        expect(roomTypeLabel('TRIPLE')).toBe('Triple');
        expect(roomTypeLabel('QUAD')).toBe('Quad');
    });
});

describe('roomTypeColors', () => {
    it('returns a unique color token set for every room type', () => {
        const results = ROOM_TYPES.map((t) => roomTypeColors(t).bg);
        expect(new Set(results).size).toBe(ROOM_TYPES.length);
    });
});

describe('roomStatusLabel', () => {
    it('maps every room status to a human label', () => {
        expect(roomStatusLabel('AVAILABLE')).toBe('Available');
        expect(roomStatusLabel('FULLY_OCCUPIED')).toBe('Fully Occupied');
        expect(roomStatusLabel('UNDER_MAINTENANCE')).toBe('Maintenance');
        expect(roomStatusLabel('RESERVED')).toBe('Reserved');
    });
});

describe('roomStatusColors', () => {
    it('returns a complete color token set for every status', () => {
        for (const status of ROOM_STATUSES) {
            const colors = roomStatusColors(status);
            expect(colors).toMatchObject({
                bg: expect.any(String),
                text: expect.any(String),
                border: expect.any(String),
                dot: expect.any(String),
            });
        }
    });

    it('uses the "available/success" green palette only for AVAILABLE', () => {
        expect(roomStatusColors('AVAILABLE').dot).toContain('green');
        expect(roomStatusColors('FULLY_OCCUPIED').dot).not.toContain('green');
    });
});

describe('formatPrice', () => {
    it('formats a numeric string as Ghana Cedi currency', () => {
        expect(formatPrice('1500')).toBe('₵1,500.00');
    });

    it('formats a plain number the same way as a numeric string', () => {
        expect(formatPrice(1500)).toBe(formatPrice('1500'));
    });

    it('adds thousands separators for large amounts', () => {
        expect(formatPrice('1234567.5')).toBe('₵1,234,567.50');
    });

    it('renders a dash placeholder for a non-numeric value', () => {
        expect(formatPrice('not-a-number')).toBe('₵—');
    });

    it('rounds/truncates to exactly two decimal places', () => {
        expect(formatPrice('99.999')).toBe('₵100.00');
        expect(formatPrice('0')).toBe('₵0.00');
    });
});

describe('bedsLabel', () => {
    it('reports "Fully occupied" when zero or fewer beds remain', () => {
        expect(bedsLabel(0)).toBe('Fully occupied');
        expect(bedsLabel(-1)).toBe('Fully occupied');
    });

    it('uses singular phrasing for exactly one bed', () => {
        expect(bedsLabel(1)).toBe('1 bed left');
    });

    it('uses plural phrasing for more than one bed', () => {
        expect(bedsLabel(2)).toBe('2 beds left');
        expect(bedsLabel(4)).toBe('4 beds left');
    });
});

describe('roomImageFallback', () => {
    it('returns a stable placeholder image URL', () => {
        const url = roomImageFallback();
        expect(url).toMatch(/^https:\/\//);
        expect(url).toContain('placehold.co');
    });
});
