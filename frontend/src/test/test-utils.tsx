import type { PropsWithChildren, ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';

/**
 * Builds a fresh {@link QueryClient} per test.
 *
 * - `retry: false` — failing mutations/queries resolve immediately instead
 *   of retrying with backoff, which would otherwise make tests slow/flaky.
 * - `gcTime: Infinity` avoids unmount garbage-collection warnings mid-test.
 */
export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: Infinity },
            mutations: { retry: false },
        },
    });
}

interface WrapperOptions {
    /** Initial route entries for MemoryRouter. Defaults to ['/']. */
    route?: string;
    queryClient?: QueryClient;
}

/**
 * All-providers wrapper for components that depend on React Query and
 * React Router (the two providers nearly every feature component needs).
 */
// eslint-disable-next-line react-refresh/only-export-components
function AllProviders({
    children,
    route = '/',
    queryClient,
}: PropsWithChildren<WrapperOptions>) {
    const client = queryClient ?? createTestQueryClient();
    return (
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </QueryClientProvider>
    );
}

/**
 * Renders a component wrapped in the same providers the real app tree
 * supplies (React Query + Router), so hooks like `useQuery` or
 * `useNavigate` work without individual mocking.
 *
 * @example
 * renderWithProviders(<BookingCard booking={mockBooking} />, { route: '/bookings' });
 */
export function renderWithProviders(
    ui: ReactElement,
    options: WrapperOptions & Omit<RenderOptions, 'wrapper'> = {}
) {
    const { route, queryClient, ...renderOptions } = options;
    return render(ui, {
        wrapper: ({ children }) => (
            <AllProviders route={route} queryClient={queryClient}>
                {children}
            </AllProviders>
        ),
        ...renderOptions,
    });
}

// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';
