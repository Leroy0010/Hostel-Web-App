import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userKeys } from '../types/user.keys';
import { apiClient } from '@/lib/axios';
import type { ApiError } from '@/types/api';
import type { UpdateProfileValues } from '@/features/user/components/ProfileTab';
import { toast } from 'sonner';
import { getManagers, getProfile, updateProfileUrl } from '../api/user.api';

/**
 * Fetches the currently authenticated user's profile and hostel context.
 *
 * `staleTime: Infinity` prevents unnecessary background refetches of identity
 * data that only changes on explicit profile updates.
 */
export function useGetCurrentProfile() {
    return useQuery({
        queryKey: userKeys.me(),
        queryFn: getProfile,
        retry: false,
        staleTime: Infinity,
    });
}

export function useUpdateProfileMutation() {
    return useMutation<void, ApiError, UpdateProfileValues>({
        mutationFn: (payload) =>
            apiClient.put<UpdateProfileValues, void>('/users/me', payload),

        onSuccess: () => {
            toast.success('Profile updated successfully.');
        },

        onError: (error) => {
            if (error.code !== 'VALIDATION_FAILED') {
                toast.error(error.message);
            }
        },
    });
}

export function useUpdateProfileUrlMutation() {
    const queryClient = useQueryClient();
    return useMutation<void, ApiError, { profileUrl: string }>({
        mutationFn: (payload) => updateProfileUrl(payload.profileUrl),

        onSuccess: () => {
            toast.success('Profile updated successfully.');
            queryClient.invalidateQueries({ queryKey: userKeys.me() });
        },

        onError: (error) => {
            if (error.code !== 'VALIDATION_FAILED') {
                toast.error(error.message);
            }
        },
    });
}

export function useGetManagers() {
    return useQuery({
        queryKey: userKeys.managers(),
        queryFn: getManagers,
    });
}
