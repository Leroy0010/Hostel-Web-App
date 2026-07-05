import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactionBar } from './ReactionBar';

const mockReact = vi.fn();
let mockIsPending = false;

vi.mock('../hooks/complaint.hooks', () => ({
    useReactToComplaint: () => ({
        mutate: mockReact,
        get isPending() {
            return mockIsPending;
        },
    }),
}));

describe('ReactionBar', () => {
    beforeEach(() => {
        mockReact.mockClear();
        mockIsPending = false;
    });

    it('renders the upvote/downvote counts and the net score', () => {
        render(
            <ReactionBar
                complaintId="c-1"
                upvotes={5}
                downvotes={2}
                netScore={3}
                currentUserVote={null}
            />
        );
        expect(screen.getByLabelText('Upvote (5)')).toBeInTheDocument();
        expect(screen.getByLabelText('Downvote (2)')).toBeInTheDocument();
        expect(screen.getByLabelText('Net score: +3')).toBeInTheDocument();
    });

    it('renders a negative net score without a leading +', () => {
        render(
            <ReactionBar
                complaintId="c-1"
                upvotes={1}
                downvotes={4}
                netScore={-3}
                currentUserVote={null}
            />
        );
        expect(screen.getByLabelText('Net score: -3')).toBeInTheDocument();
    });

    it('marks the upvote button as pressed when currentUserVote is true', () => {
        render(
            <ReactionBar
                complaintId="c-1"
                upvotes={1}
                downvotes={0}
                netScore={1}
                currentUserVote={true}
            />
        );
        expect(screen.getByLabelText('Upvote (1)')).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        expect(screen.getByLabelText('Downvote (0)')).toHaveAttribute(
            'aria-pressed',
            'false'
        );
    });

    it('marks the downvote button as pressed when currentUserVote is false', () => {
        render(
            <ReactionBar
                complaintId="c-1"
                upvotes={0}
                downvotes={1}
                netScore={-1}
                currentUserVote={false}
            />
        );
        expect(screen.getByLabelText('Downvote (1)')).toHaveAttribute(
            'aria-pressed',
            'true'
        );
    });

    it('calls the mutation with isUpvote:true when the upvote button is clicked', async () => {
        const user = userEvent.setup();
        render(
            <ReactionBar
                complaintId="c-1"
                upvotes={0}
                downvotes={0}
                netScore={0}
                currentUserVote={null}
            />
        );
        await user.click(screen.getByLabelText('Upvote (0)'));
        expect(mockReact).toHaveBeenCalledWith({ isUpvote: true });
    });

    it('calls the mutation with isUpvote:false when the downvote button is clicked', async () => {
        const user = userEvent.setup();
        render(
            <ReactionBar
                complaintId="c-1"
                upvotes={0}
                downvotes={0}
                netScore={0}
                currentUserVote={null}
            />
        );
        await user.click(screen.getByLabelText('Downvote (0)'));
        expect(mockReact).toHaveBeenCalledWith({ isUpvote: false });
    });

    it('disables both buttons and blocks voting when disabled=true', async () => {
        const user = userEvent.setup();
        render(
            <ReactionBar
                complaintId="c-1"
                upvotes={0}
                downvotes={0}
                netScore={0}
                currentUserVote={null}
                disabled
            />
        );
        const upvote = screen.getByLabelText('Upvote (0)');
        expect(upvote).toBeDisabled();
        await user.click(upvote);
        expect(mockReact).not.toHaveBeenCalled();
    });

    it('disables both buttons while a vote mutation is already pending', () => {
        mockIsPending = true;
        render(
            <ReactionBar
                complaintId="c-1"
                upvotes={0}
                downvotes={0}
                netScore={0}
                currentUserVote={null}
            />
        );
        expect(screen.getByLabelText('Upvote (0)')).toBeDisabled();
        expect(screen.getByLabelText('Downvote (0)')).toBeDisabled();
    });
});
