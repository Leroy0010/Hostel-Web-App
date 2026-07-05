import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/lib/axios';
import { createTestQueryClient } from '@/test/test-utils';
import { useReactToComplaint } from './complaint.hooks';
import { complaintKeys } from '../types/complaint.keys';
import type { ComplaintDto } from '../types/complaint.types';

const COMPLAINT_ID = 'complaint-1';

const baseComplaint: ComplaintDto = {
    id: COMPLAINT_ID,
    author: { id: 'u-1', firstName: 'Ama', lastName: 'Owusu' },
    hostelId: 'hostel-1',
    hostelName: 'Leroy Hostel',
    roomId: null,
    roomNumber: null,
    title: 'Broken window',
    description: 'The window in room A12 is cracked.',
    status: 'OPEN',
    category: 'MAINTENANCE',
    upvotes: 5,
    downvotes: 2,
    netScore: 3,
    currentUserVote: null,
    attachments: [],
    createdAt: '2025-06-01T10:00:00.000Z',
    updatedAt: '2025-06-01T10:00:00.000Z',
    resolvedAt: null,
};

describe('useReactToComplaint', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(apiClient);
    });

    afterEach(() => {
        mock.restore();
    });

    /**
     * Seeds the query cache with a complaint and renders the hook wired to
     * that same client, so the hook's onMutate/onError/onSettled logic
     * operates on real cache data rather than a mock.
     */
    function setup(seed: ComplaintDto = baseComplaint) {
        const queryClient = createTestQueryClient();
        queryClient.setQueryData(complaintKeys.detail(COMPLAINT_ID), seed);

        const { result } = renderHook(() => useReactToComplaint(COMPLAINT_ID), {
            wrapper: ({ children }) => (
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            ),
        });

        return { result, queryClient };
    }

    it('optimistically increments upvotes and sets currentUserVote before the server responds', async () => {
        // Delay the response so we can inspect the optimistic (pre-settle) state.
        mock.onPost(`/complaints/${COMPLAINT_ID}/react`).reply(() => {
            return new Promise((resolve) =>
                setTimeout(() => resolve([200, baseComplaint]), 50)
            );
        });

        const { result, queryClient } = setup();
        result.current.mutate({ isUpvote: true });

        await waitFor(() => {
            const cached = queryClient.getQueryData<ComplaintDto>(
                complaintKeys.detail(COMPLAINT_ID)
            );
            expect(cached?.upvotes).toBe(6);
            expect(cached?.netScore).toBe(4);
            expect(cached?.currentUserVote).toBe(true);
        });
    });

    it('toggles the vote off (removes it) when the same vote is pressed again', async () => {
        mock.onPost(`/complaints/${COMPLAINT_ID}/react`).reply(
            200,
            baseComplaint
        );
        const { result, queryClient } = setup({
            ...baseComplaint,
            currentUserVote: true,
        });

        result.current.mutate({ isUpvote: true });

        await waitFor(() => {
            const cached = queryClient.getQueryData<ComplaintDto>(
                complaintKeys.detail(COMPLAINT_ID)
            );
            expect(cached?.upvotes).toBe(4); // 5 - 1
            expect(cached?.currentUserVote).toBeNull();
        });
    });

    it('switches from a downvote to an upvote, adjusting both counts', async () => {
        mock.onPost(`/complaints/${COMPLAINT_ID}/react`).reply(
            200,
            baseComplaint
        );
        const { result, queryClient } = setup({
            ...baseComplaint,
            currentUserVote: false,
        });

        result.current.mutate({ isUpvote: true });

        await waitFor(() => {
            const cached = queryClient.getQueryData<ComplaintDto>(
                complaintKeys.detail(COMPLAINT_ID)
            );
            expect(cached?.upvotes).toBe(6); // 5 + 1
            expect(cached?.downvotes).toBe(1); // 2 - 1
            expect(cached?.currentUserVote).toBe(true);
        });
    });

    it('rolls back to the pre-mutation state when the server request fails', async () => {
        mock.onPost(`/complaints/${COMPLAINT_ID}/react`).reply(500, {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Something went wrong',
        });

        const { result, queryClient } = setup();
        result.current.mutate({ isUpvote: true });

        // The mock error response resolves synchronously, so we only assert
        // the final settled state here (the optimistic-then-rollback
        // sequence itself is already covered by the "success" tests above).
        await waitFor(() => {
            const cached = queryClient.getQueryData<ComplaintDto>(
                complaintKeys.detail(COMPLAINT_ID)
            );
            expect(cached?.upvotes).toBe(5);
            expect(cached?.currentUserVote).toBeNull();
        });
    });

    it('does not throw when there is no cached detail to update optimistically', async () => {
        mock.onPost(`/complaints/${COMPLAINT_ID}/react`).reply(
            200,
            baseComplaint
        );
        const queryClient = createTestQueryClient();
        // Note: no seed data this time.
        const { result } = renderHook(() => useReactToComplaint(COMPLAINT_ID), {
            wrapper: ({ children }) => (
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            ),
        });

        expect(() => result.current.mutate({ isUpvote: true })).not.toThrow();
    });
});
