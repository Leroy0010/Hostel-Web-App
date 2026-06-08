import { useMutation, useQuery } from '@tanstack/react-query';
import { userKeys } from '../types/user.keys';
import { apiClient } from '@/lib/axios';
import type { ApiError } from '@/types/api';
import type { UpdateProfileValues } from '@/features/user/components/ProfileTab';
import { toast } from 'sonner';
import type { MeResponse } from '../types/user.types';

/**
 * Fetches the currently authenticated user's profile and hostel context.
 *
 * `staleTime: Infinity` prevents unnecessary background refetches of identity
 * data that only changes on explicit profile updates.
 */
export function useGetCurrentProfile() {
    return useQuery({
        queryKey: userKeys.me(),
        queryFn: async () => apiClient.get<never, MeResponse>('/users/me'),
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
