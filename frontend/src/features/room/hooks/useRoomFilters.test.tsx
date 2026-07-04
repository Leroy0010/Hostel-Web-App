import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRoomFilters } from './useRoomFilters';

describe('useRoomFilters', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('defaults to no filters, page 0, and sorts by ascending price', () => {
        const { result } = renderHook(() => useRoomFilters());
        expect(result.current.filters).toEqual({
            roomType: 'ALL',
            maxPrice: '',
        });
        expect(result.current.page).toBe(0);
        expect(result.current.apiParams).toMatchObject({
            roomType: undefined,
            maxPrice: undefined,
            page: 0,
            size: 12,
            sort: 'pricePerSemester,asc',
        });
    });

    it('strips the ALL sentinel from roomType in apiParams', () => {
        const { result } = renderHook(() => useRoomFilters());
        act(() => {
            result.current.setFilters({ roomType: 'DOUBLE', maxPrice: '' });
        });
        expect(result.current.apiParams.roomType).toBe('DOUBLE');
    });

    it('resets the page to 0 whenever filters change', () => {
        const { result } = renderHook(() => useRoomFilters());
        act(() => {
            result.current.setPage(3);
        });
        expect(result.current.page).toBe(3);

        act(() => {
            result.current.setFilters({ roomType: 'SINGLE', maxPrice: '' });
        });
        expect(result.current.page).toBe(0);
    });

    it('debounces maxPrice before it appears in apiParams', () => {
        vi.useFakeTimers();
        const { result, rerender } = renderHook(() => useRoomFilters());

        act(() => {
            result.current.setFilters({ roomType: 'ALL', maxPrice: '2000' });
        });
        rerender();
        // Debounce window (400ms) has not elapsed yet.
        expect(result.current.apiParams.maxPrice).toBeUndefined();

        act(() => {
            vi.advanceTimersByTime(400);
        });
        rerender();
        expect(result.current.apiParams.maxPrice).toBe(2000);
    });

    it('honours a custom pageSize', () => {
        const { result } = renderHook(() => useRoomFilters(20));
        expect(result.current.apiParams.size).toBe(20);
    });
});
