import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns the initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 400));
        expect(result.current).toBe('initial');
    });

    it('does not update the debounced value before the delay elapses', () => {
        vi.useFakeTimers();
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 400),
            { initialProps: { value: 'a' } }
        );

        rerender({ value: 'b' });
        act(() => {
            vi.advanceTimersByTime(399);
        });
        expect(result.current).toBe('a');
    });

    it('updates the debounced value once the delay has elapsed', () => {
        vi.useFakeTimers();
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 400),
            { initialProps: { value: 'a' } }
        );

        rerender({ value: 'b' });
        act(() => {
            vi.advanceTimersByTime(400);
        });
        expect(result.current).toBe('b');
    });

    it('resets the timer on rapid successive changes (only the last value wins)', () => {
        vi.useFakeTimers();
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 400),
            { initialProps: { value: 'a' } }
        );

        rerender({ value: 'b' });
        act(() => {
            vi.advanceTimersByTime(200);
        });
        rerender({ value: 'c' });
        act(() => {
            vi.advanceTimersByTime(200);
        });
        // Only 200ms have passed since 'c' was set — should still be 'a'.
        expect(result.current).toBe('a');

        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(result.current).toBe('c');
    });

    it('uses the default 400ms delay when none is provided', () => {
        vi.useFakeTimers();
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value),
            { initialProps: { value: 'a' } }
        );
        rerender({ value: 'z' });
        act(() => {
            vi.advanceTimersByTime(400);
        });
        expect(result.current).toBe('z');
    });
});
