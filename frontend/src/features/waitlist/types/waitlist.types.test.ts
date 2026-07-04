import { describe, it, expect } from 'vitest';
import { joinWaitlistSchema } from './waitlist.types';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

const validPayload = {
    hostelId: VALID_UUID,
    roomType: 'SINGLE',
    academicYear: '2025/2026',
    semester: 'FIRST',
    selectedPeriodKey: '2025/2026|FIRST',
};

describe('joinWaitlistSchema', () => {
    it('accepts a fully valid payload', () => {
        expect(joinWaitlistSchema.safeParse(validPayload).success).toBe(true);
    });

    it('rejects a non-RFC4122 UUID for hostelId', () => {
        const result = joinWaitlistSchema.safeParse({
            ...validPayload,
            hostelId: '11111111-1111-1111-1111-111111111111', // invalid variant nibble
        });
        expect(result.success).toBe(false);
    });

    it('rejects a roomType outside the known enum', () => {
        const result = joinWaitlistSchema.safeParse({
            ...validPayload,
            roomType: 'PENTHOUSE',
        });
        expect(result.success).toBe(false);
    });

    it('rejects an academicYear that does not match YYYY/YYYY', () => {
        const result = joinWaitlistSchema.safeParse({
            ...validPayload,
            academicYear: '2025-2026',
        });
        expect(result.success).toBe(false);
    });

    it('rejects a semester outside FIRST/SECOND/FULL', () => {
        const result = joinWaitlistSchema.safeParse({
            ...validPayload,
            semester: 'SUMMER',
        });
        expect(result.success).toBe(false);
    });

    it('rejects an empty selectedPeriodKey', () => {
        const result = joinWaitlistSchema.safeParse({
            ...validPayload,
            selectedPeriodKey: '',
        });
        expect(result.success).toBe(false);
    });

    it('rejects a payload missing academicYear/semester/selectedPeriodKey entirely', () => {
        const { academicYear, semester, selectedPeriodKey, ...rest } =
            validPayload;
        void academicYear;
        void semester;
        void selectedPeriodKey;
        const result = joinWaitlistSchema.safeParse(rest);
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join('.'));
            expect(paths).toEqual(
                expect.arrayContaining([
                    'academicYear',
                    'semester',
                    'selectedPeriodKey',
                ])
            );
        }
    });
});
