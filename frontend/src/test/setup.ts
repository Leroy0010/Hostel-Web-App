import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// -----------------------------------------------------------------------
// Automatic cleanup after every test to prevent DOM leakage between tests.
// -----------------------------------------------------------------------
afterEach(() => {
    cleanup();
});

// -----------------------------------------------------------------------
// jsdom does not implement matchMedia — required by next-themes,
// useReducedMotion (Framer Motion), and any Tailwind dark-mode checks.
// -----------------------------------------------------------------------
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// -----------------------------------------------------------------------
// jsdom does not implement ResizeObserver / IntersectionObserver, both of
// which are used by various Radix/shadcn primitives (popovers, selects).
// -----------------------------------------------------------------------
class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

class MockIntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds: number[] = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
        return [];
    }
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

// -----------------------------------------------------------------------
// jsdom does not implement the Pointer Capture API, which Radix UI's
// Select/Combobox primitives call on pointerdown. Without these, clicking
// a Radix <Select> trigger throws "target.hasPointerCapture is not a
// function" and aborts the test.
// -----------------------------------------------------------------------
if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
}
if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
}
if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
}

// -----------------------------------------------------------------------
// scrollIntoView is used by Radix Select/Combobox and is missing in jsdom.
// -----------------------------------------------------------------------
if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
}

// -----------------------------------------------------------------------
// jsdom does not implement window.scrollTo, which some interactions
// (e.g. focus management after removing a react-hook-form field-array row)
// call incidentally. Without this it just prints a noisy "Not implemented"
// warning to the console on every such interaction.
// -----------------------------------------------------------------------
window.scrollTo = vi.fn();
