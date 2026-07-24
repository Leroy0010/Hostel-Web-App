import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '../store/useAuthStore';
import type {
    ChangePasswordForm,
    LoginCredentials,
    LoginResponse,
    PasswordResetConfirmForm,
    PasswordResetRequestForm,
    ResendVerificationForm,
} from '../types';
import type { ApiError } from '@/types/api';
import { toast } from 'sonner';
import { authKeys } from './auth.keys';

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useVerifyEmail(params: { token: string }) {
    return useQuery<boolean, ApiError>({
        queryKey: authKeys.verifyEmail(params.token),
        queryFn: async () => {
            // Wait for the API call to finish
            await apiClient.get(`/auth/verify-email`, {
                params,
            });
            // Only return true if the request above doesn't throw an error
            return true;
        },

        enabled: !!params.token,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        staleTime: Infinity,
    });
}

export function useResendVerificationMutation() {
    return useMutation<void, ApiError, ResendVerificationForm>({
        mutationFn: (payload) =>
            apiClient.post<ResendVerificationForm, void>(
                '/auth/verify-email/resend',
                payload
            ),
        onSuccess: () => {
            // Vague success message prevents attackers from knowing if the email exists
            toast.success(
                'If your email is registered and unverified, a new link has been sent.'
            );
        },
        onError: (error) => {
            // Ignore validation errors in the toast, let the form handle them
            if (error.code !== 'VALIDATION_FAILED') {
                toast.error(error.message);
            }
        },
    });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Handles credential validation and loads the full auth profile on success.
 *
 * The mutation returns `LoginResponse` directly because the Axios interceptor
 * unwraps the API envelope before this resolves.
 */
export function useLoginMutation() {
    return useMutation<LoginResponse, ApiError, LoginCredentials>({
        mutationFn: (credentials) =>
            apiClient.post<LoginCredentials, LoginResponse>(
                '/auth/login',
                credentials
            ),
        onError: (error) => {
            if (error.code !== 'VALIDATION_FAILED') {
                toast.error(error.message);
            }
            // Ensure no stale token lingers if login fails mid-flight.
            useAuthStore.getState().clearAuth();
        },
    });
}

/**
 * Terminates the current session.
 *
 * Calls the backend `/auth/logout` endpoint which invalidates the server-side
 * refresh token and clears the HttpOnly cookie, then wipes local auth state.
 *
 * Fire-and-forget semantics: even if the network call fails we clear local
 * state so the user is never trapped in an unresponsive "logging out" state.
 */
export function useLogoutMutation() {
    const clearAuth = useAuthStore((state) => state.clearAuth);

    return useMutation<void, ApiError, void>({
        mutationFn: () => apiClient.post<void, void>('/auth/logout', {}),
        onSettled: () => {
            clearAuth();
        },
    });
}

export function useRequestPasswordResetMutation() {
    return useMutation<void, ApiError, PasswordResetRequestForm>({
        mutationFn: (payload) =>
            apiClient.post<PasswordResetRequestForm, void>(
                '/auth/password-reset/request',
                payload
            ),

        onSuccess: () => {
            toast.success(
                'Password reset instructions have been sent if the email exists.'
            );
        },

        onError: (error) => {
            toast.error(error.message);
        },
    });
}

export function useConfirmPasswordResetMutation() {
    return useMutation<void, ApiError, PasswordResetConfirmForm>({
        mutationFn: (payload) =>
            apiClient.post<PasswordResetConfirmForm, void>(
                '/auth/password-reset/confirm',
                payload
            ),

        onSuccess: (_, vars) => {
            if (vars.type === 'reset')
                toast.success('Password reset successfully.');
            else toast.success('Account activated successfully.');
        },

        onError: (error) => {
            if (error.code !== 'VALIDATION_FAILED') {
                toast.error(error.message);
            }
        },
    });
}

export function useChangePasswordMutation() {
    return useMutation<void, ApiError, ChangePasswordForm>({
        mutationFn: (payload) =>
            apiClient.post<ChangePasswordForm, void>(
                '/auth/password-change',
                payload
            ),

        onSuccess: () => {
            toast.success('Password changed successfully.');
        },

        onError: (error) => {
            if (error.code !== 'VALIDATION_FAILED') {
                toast.error(error.message);
            }
        },
    });
}
