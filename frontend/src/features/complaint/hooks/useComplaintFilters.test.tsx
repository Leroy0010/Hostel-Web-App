import type { PropsWithChildren } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useComplaintFilters } from './useComplaintFilters';

function wrapper(initialEntry = '/complaints') {
    return ({ children }: PropsWithChildren) => (
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    );
}

describe('useComplaintFilters', () => {
    it('defaults to status ALL and page 0 with no URL params', () => {
        const { result } = renderHook(() => useComplaintFilters(), {
            wrapper: wrapper(),
        });
        expect(result.current.filters.status).toBe('ALL');
        expect(result.current.page).toBe(0);
        expect(result.current.apiParams).toEqual({ page: 0, size: 10 });
    });

    it('reads the initial status and page from the URL', () => {
        const { result } = renderHook(() => useComplaintFilters(), {
            wrapper: wrapper('/complaints?status=OPEN&page=2'),
        });
        expect(result.current.filters.status).toBe('OPEN');
        expect(result.current.page).toBe(2);
        expect(result.current.apiParams).toEqual({
            page: 2,
            size: 10,
            status: 'OPEN',
        });
    });

    it('clamps a negative page param to 0', () => {
        const { result } = renderHook(() => useComplaintFilters(), {
            wrapper: wrapper('/complaints?page=-3'),
        });
        expect(result.current.page).toBe(0);
    });

    it('setFilters updates the status and resets the page to 0', () => {
        const { result } = renderHook(() => useComplaintFilters(), {
            wrapper: wrapper('/complaints?status=OPEN&page=3'),
        });

        act(() => {
            result.current.setFilters({ status: 'RESOLVED' });
        });

        expect(result.current.filters.status).toBe('RESOLVED');
        expect(result.current.page).toBe(0);
    });

    it('setFilters with ALL removes the status param entirely', () => {
        const { result } = renderHook(() => useComplaintFilters(), {
            wrapper: wrapper('/complaints?status=CLOSED'),
        });

        act(() => {
            result.current.setFilters({ status: 'ALL' });
        });

        expect(result.current.filters.status).toBe('ALL');
        expect(result.current.apiParams).toEqual({ page: 0, size: 10 });
    });

    it('setPage updates the page without touching the status filter', () => {
        const { result } = renderHook(() => useComplaintFilters(), {
            wrapper: wrapper('/complaints?status=IN_PROGRESS'),
        });

        act(() => {
            result.current.setPage(4);
        });

        expect(result.current.page).toBe(4);
        expect(result.current.filters.status).toBe('IN_PROGRESS');
    });

    it('setPage(0) removes the page param rather than writing "0"', () => {
        const { result } = renderHook(() => useComplaintFilters(), {
            wrapper: wrapper('/complaints?page=3'),
        });

        act(() => {
            result.current.setPage(0);
        });

        expect(result.current.page).toBe(0);
        expect(result.current.apiParams.page).toBe(0);
    });

    it('honours a custom pageSize for apiParams', () => {
        const { result } = renderHook(() => useComplaintFilters(25), {
            wrapper: wrapper(),
        });
        expect(result.current.apiParams.size).toBe(25);
    });
});
