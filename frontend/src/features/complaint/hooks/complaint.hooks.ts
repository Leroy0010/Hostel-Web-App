import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { complaintKeys } from '../types/complaint.keys';
import {
    addAttachment,
    createComplaint,
    deleteAttachment,
    deleteComplaint,
    fetchComplaintById,
    fetchHostelComplaints,
    fetchMyComplaints,
    reactToComplaint,
    updateComplaintStatus,
} from '../api/complaint.api';
import type {
    AddAttachmentPayload,
    AttachmentDto,
    ComplaintDto,
    ComplaintPageParams,
    CreateComplaintPayload,
    ReactPayload,
    UpdateComplaintStatusPayload,
} from '../types/complaint.types';
import type { ApiError } from '@/types/api';

// =============================================================================
// Queries
// =============================================================================

/** Student's own complaints, paginated. */
export function useMyComplaints(params: ComplaintPageParams = {}) {
    return useQuery({
        queryKey: complaintKeys.myComplaints(params),
        queryFn: () => fetchMyComplaints(params),
        staleTime: 60 * 1000,
        placeholderData: (prev) => prev,
    });
}

/** Single complaint full detail (any authenticated user). */
export function useComplaintDetail(id: string | null | undefined) {
    return useQuery({
        queryKey: complaintKeys.detail(id ?? ''),
        queryFn: () => fetchComplaintById(id!),
        enabled: Boolean(id),
        staleTime: 30 * 1000,
    });
}

/** Manager/admin: all complaints for a hostel. */
export function useHostelComplaints(
    hostelId: string | null | undefined,
    params: ComplaintPageParams = {}
) {
    return useQuery({
        queryKey: complaintKeys.hostelComplaints(hostelId ?? '', params),
        queryFn: () => fetchHostelComplaints(hostelId!, params),
        enabled: Boolean(hostelId),
        staleTime: 30 * 1000,
        placeholderData: (prev) => prev,
    });
}

// =============================================================================
// Mutations
// =============================================================================

/** Student: raises a new complaint. */
export function useCreateComplaint() {
    const queryClient = useQueryClient();

    return useMutation<ComplaintDto, ApiError, CreateComplaintPayload>({
        mutationFn: createComplaint,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: complaintKeys.myComplaints(),
            });
            toast.success('Complaint submitted successfully.');
        },
        onError: (error) => {
             toast.error(error.message);
        }
    });
}

/** Student: deletes their own OPEN complaint. */
export function useDeleteComplaint(complaintId: string) {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, void>({
        mutationFn: () => deleteComplaint(complaintId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: complaintKeys.myComplaints(),
            });
            queryClient.invalidateQueries({
                queryKey: complaintKeys.detail(complaintId),
            });
            toast.success('Complaint deleted.');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
}

/** Manager/admin: updates complaint status. */
export function useUpdateComplaintStatus(
    complaintId: string,
    hostelId: string
) {
    const queryClient = useQueryClient();

    return useMutation<ComplaintDto, ApiError, UpdateComplaintStatusPayload>({
        mutationFn: (payload) => updateComplaintStatus(complaintId, payload),
        onSuccess: (updated) => {
            queryClient.setQueryData(
                complaintKeys.detail(complaintId),
                updated
            );
            queryClient.invalidateQueries({
                queryKey: complaintKeys.hostelComplaints(hostelId),
            });
            toast.success('Status updated.');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
}

/**
 * Any authenticated user: upvote or downvote a complaint.
 *
 * Uses **optimistic update** — the vote count changes instantly in the UI
 * and rolls back if the server returns an error. This follows the §8 UX
 * standard for optimistic UI.
 */
export function useReactToComplaint(complaintId: string) {
    const queryClient = useQueryClient();

    return useMutation<
        ComplaintDto,
        ApiError,
        ReactPayload,
        { prev: ComplaintDto | undefined }
    >({
        mutationFn: (payload) => reactToComplaint(complaintId, payload),

        // Optimistic update: update the detail cache immediately
        onMutate: async (payload) => {
            await queryClient.cancelQueries({
                queryKey: complaintKeys.detail(complaintId),
            });

            const prev = queryClient.getQueryData<ComplaintDto>(
                complaintKeys.detail(complaintId)
            );

            if (prev) {
                const wasUpvoted = prev.currentUserVote === true;
                const wasDownvoted = prev.currentUserVote === false;
                const isUpvoting = payload.isUpvote;

                // Toggle same vote = remove it; different vote = switch
                let newUpvotes = prev.upvotes;
                let newDownvotes = prev.downvotes;
                let newVote: boolean | null;

                if (isUpvoting && wasUpvoted) {
                    // Removing upvote
                    newUpvotes -= 1;
                    newVote = null;
                } else if (!isUpvoting && wasDownvoted) {
                    // Removing downvote
                    newDownvotes -= 1;
                    newVote = null;
                } else if (isUpvoting) {
                    newUpvotes += 1;
                    if (wasDownvoted) newDownvotes -= 1;
                    newVote = true;
                } else {
                    newDownvotes += 1;
                    if (wasUpvoted) newUpvotes -= 1;
                    newVote = false;
                }

                queryClient.setQueryData(complaintKeys.detail(complaintId), {
                    ...prev,
                    upvotes: newUpvotes,
                    downvotes: newDownvotes,
                    netScore: newUpvotes - newDownvotes,
                    currentUserVote: newVote,
                });
            }

            return { prev };
        },

        // Roll back on error
        onError: (_err, _vars, context) => {
            if (context?.prev) {
                queryClient.setQueryData(
                    complaintKeys.detail(complaintId),
                    context.prev
                );
            }
        },

        // Always sync with server truth after settle
        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: complaintKeys.detail(complaintId),
            });
        },
    });
}

/** Add an attachment to a complaint. */
export function useAddAttachment(complaintId: string) {
    const queryClient = useQueryClient();

    return useMutation<AttachmentDto, ApiError, AddAttachmentPayload>({
        mutationFn: (payload) => addAttachment(complaintId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: complaintKeys.detail(complaintId),
            });
            toast.success('Attachment added.');
        },
    });
}

/** Remove an attachment. */
export function useDeleteAttachment(complaintId: string) {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: (attachmentId) => deleteAttachment(attachmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: complaintKeys.detail(complaintId),
            });
            toast.success('Attachment removed.');
        },
    });
}
