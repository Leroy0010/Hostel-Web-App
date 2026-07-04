import type { PropsWithChildren } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useBookingFilters } from './useBookingFilters';

function wrapper(initialEntry = '/bookings') {
    return ({ children }: PropsWithChildren) => (
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    );
}

describe('useBookingFilters', () => {
    it('defaults to status ALL and page 0 with no URL params', () => {
        const { result } = renderHook(() => useBookingFilters(), {
            wrapper: wrapper(),
        });
        expect(result.current.filters.status).toBe('ALL');
        expect(result.current.page).toBe(0);
        expect(result.current.apiParams).toEqual({ page: 0, size: 10 });
    });

    it('reads the initial status and page from the URL', () => {
        const { result } = renderHook(() => useBookingFilters(), {
            wrapper: wrapper('/bookings?status=APPROVED&page=2'),
        });
        expect(result.current.filters.status).toBe('APPROVED');
        expect(result.current.page).toBe(2);
        expect(result.current.apiParams).toEqual({
            page: 2,
            size: 10,
            status: 'APPROVED',
        });
    });

    it('clamps a negative page param to 0', () => {
        const { result } = renderHook(() => useBookingFilters(), {
            wrapper: wrapper('/bookings?page=-5'),
        });
        expect(result.current.page).toBe(0);
    });

    it('setFilters updates the status and resets the page to 0', () => {
        const { result } = renderHook(() => useBookingFilters(), {
            wrapper: wrapper('/bookings?status=PENDING&page=3'),
        });

        act(() => {
            result.current.setFilters({ status: 'CHECKED_IN' });
        });

        expect(result.current.filters.status).toBe('CHECKED_IN');
        expect(result.current.page).toBe(0);
    });

    it('setFilters with ALL removes the status param entirely', () => {
        const { result } = renderHook(() => useBookingFilters(), {
            wrapper: wrapper('/bookings?status=PENDING'),
        });

        act(() => {
            result.current.setFilters({ status: 'ALL' });
        });

        expect(result.current.filters.status).toBe('ALL');
        expect(result.current.apiParams).toEqual({ page: 0, size: 10 });
    });

    it('setPage updates the page without touching the status filter', () => {
        const { result } = renderHook(() => useBookingFilters(), {
            wrapper: wrapper('/bookings?status=REJECTED'),
        });

        act(() => {
            result.current.setPage(4);
        });

        expect(result.current.page).toBe(4);
        expect(result.current.filters.status).toBe('REJECTED');
    });

    it('setPage(0) removes the page param rather than writing "0"', () => {
        const { result } = renderHook(() => useBookingFilters(), {
            wrapper: wrapper('/bookings?page=3'),
        });

        act(() => {
            result.current.setPage(0);
        });

        expect(result.current.page).toBe(0);
        expect(result.current.apiParams.page).toBe(0);
    });

    it('honours a custom pageSize for apiParams', () => {
        const { result } = renderHook(() => useBookingFilters(25), {
            wrapper: wrapper(),
        });
        expect(result.current.apiParams.size).toBe(25);
    });
});
